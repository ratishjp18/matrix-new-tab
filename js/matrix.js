/* ============================================================
   Matrix Digital Rain — state-based grid renderer
   ─────────────────────────────────────────────────────────────
   Architecture (replaces cumulative-overlay approach):

   • A flat grid  gChar[c*rows+r]   holds one character per cell.
   • A flat grid  gBright[c*rows+r] holds its brightness [0,1].
   • Every frame:
       1. canvas is cleared to pure #000000  (no overlay fade)
       2. stream heads advance and stamp brightness=1 on new cells
       3. every cell is rendered ONCE at its current brightness
       4. every cell's brightness is multiplied by DECAY
   • Fading is numeric state change, not repeated canvas painting.
   • DPR-aware backing resolution for crisp text on all screens.

   Settings (custom DOM events dispatched by app.js):
     matrixColorChange   → rebuild colour LUT
     matrixCharsetChange → refresh all cell characters
     matrixDensityChange → reinitialise streams
     matrixGlowChange    → stored (glow not applied per spec)
     matrixBgSpeedChange → restart loop
     data-bg-speed attr  → speed multiplier

   Preserved extras:
     Mouse repel · Click-to-boost · Konami code · Neo messages
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     CONSTANTS
     ============================================================ */
  const CELL   = 25;      // grid cell size in CSS px (width AND height)
  const FSIZE  = 24;      // font-size in CSS px  (must be < CELL)
  const FONT   = `400 ${FSIZE}px Consolas, "Courier New", monospace`;

  /* Brightness model
     ─────────────────
     DECAY    — per-frame multiplier applied to every cell's brightness.
                0.88 at 60 fps ⇒ trail of ~18–20 cells at speed 1.
     AMBIENT  — floor value; cells never go below this, keeping a faint
                background grid visible at all times (≈ #001A00 for green).
     THRESH   — minimum brightness to bother rendering (skip near-black).  */
  const DECAY   = 0.88;
  const AMBIENT = 0.10;   // ≈ rgb(0,26,0) = #001A00  (faint)
  const THRESH  = 0.04;   // below this skip fillText entirely

  /* ============================================================
     CHARACTER SETS
     ============================================================ */
  const CHAR_SETS = {
    classic: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    english: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
  };

  /* ============================================================
     COLOUR THEMES
     Each theme defined as [R, G, B] at brightness = 1.0.
     Colour at brightness b = rgb( R*b, G*b, B*b ).
     This gives natural linear fading to black at b=0.

     Reference palette for green theme (linear scale):
       b=1.00 → rgb(0,255,0)  = #00FF00  bright
       b=0.60 → rgb(0,153,0)  = #009900  medium
       b=0.27 → rgb(0, 68,0)  = #004400  dim
       b=0.10 → rgb(0, 26,0)  = #001A00  faint  ← AMBIENT
       b=0.00 → rgb(0,  0,0)  = #000000  background
     ============================================================ */
  const THEME_MAX = {
    green:   [  0, 255,   0],
    blue:    [  0, 160, 255],
    red:     [255,  32,  32],
    white:   [220, 220, 220],
    purple:  [170,   0, 255],
    cyan:    [  0, 255, 255],
    orange:  [255, 110,   0],
    gold:    [255, 200,   0],
    pink:    [255,   0, 128],
    teal:    [  0, 200, 170],
    lime:    [140, 255,   0],
    sky:     [  0, 180, 255],
    crimson: [220,  20,  60],
    amber:   [255, 170,   0],
    violet:  [138,  43, 226],
  };

  /* Grayscale LUT for Konami override — computed once */
  const WHITE_LUT = Array.from({ length: 256 }, (_, i) => `rgb(${i},${i},${i})`);

  /* ============================================================
     SPEED / DENSITY TABLES
     ============================================================ */
  const SPEED_MULT   = { slow: 0.30, normal: 1.00, fast: 2.50 };
  const DENSITY_FRAC = { sparse: 0.40, normal: 0.70, dense: 1.00 };

  /* ============================================================
     EXTRAS (Konami / Neo)
     ============================================================ */
  const KONAMI   = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown',
                    'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  const NEO_MSGS = ['Wake up, Neo...', 'The Matrix has you.',
                    'Follow the white rabbit.', 'Knock, knock, Neo.', 'Free your mind.'];
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============================================================
     CANVAS
     ============================================================ */
  const canvas = document.getElementById('matrix');
  const ctx    = canvas.getContext('2d');
  const DPR    = window.devicePixelRatio || 1;

  let animId = null, lastTime = 0;
  let viewW = 0, viewH = 0;   // logical (CSS) viewport dimensions
  let cols  = 0, rows  = 0;   // grid dimensions in cells

  /* ============================================================
     GRID STATE
     Flat arrays indexed by  c * rows + r
     ============================================================ */
  let gChar   = [];           // string  — character for each cell
  let gBright = null;         // Float32Array — brightness [0,1] for each cell

  /* ============================================================
     STREAM STATE  (one stream per column)
     ============================================================ */
  let streams       = [];     // { y, prevY, speed }
  let streamEnabled = [];     // boolean — whether column has an active stream

  /* ============================================================
     COLOUR LUT  (256-entry; rebuilt on theme change)
     ============================================================ */
  let colorLUT = [];

  /* ============================================================
     SETTINGS STATE
     ============================================================ */
  let rainColor  = 'green';
  let charSetKey = 'classic';
  let density    = 'dense';
  let useGlow    = false;     // stored for event compat; glow not applied per spec

  /* ============================================================
     MOUSE / KONAMI / NEO STATE
     ============================================================ */
  let mouseX = -9999, mouseY = -9999;

  let konamiBuffer = [], konamiActive = false, konamiTimer = 0;

  let neoTimer   = 90 + Math.random() * 90;
  let neoPhase   = 'idle';
  let neoOpacity = 0;
  let neoEl      = null;

  /* ============================================================
     HELPERS
     ============================================================ */
  function speedMult() {
    if (REDUCED_MOTION) return 0;
    return SPEED_MULT[document.documentElement.dataset.bgSpeed || 'fast'] ?? 1.0;
  }

  function rndChar() {
    const ch = CHAR_SETS[charSetKey] || CHAR_SETS.classic;
    return ch[(Math.random() * ch.length) | 0];
  }

  /* Rebuild the 256-step colour LUT for the current theme */
  function buildColorLUT() {
    const [mr, mg, mb] = THEME_MAX[rainColor] || THEME_MAX.green;
    colorLUT = new Array(256);
    for (let i = 0; i < 256; i++) {
      const b = i / 255;
      colorLUT[i] =
        `rgb(${(mr * b + 0.5) | 0},${(mg * b + 0.5) | 0},${(mb * b + 0.5) | 0})`;
    }
  }

  /* ============================================================
     CANVAS / GRID SETUP
     ============================================================ */
  function resize() {
    viewW = window.innerWidth;
    viewH = window.innerHeight;

    /* ── DPR-aware backing resolution ──────────────────────────
       canvas.width/height = physical pixels (DPR × CSS pixels).
       canvas.style.width/height keeps the element at CSS size.
       ctx.setTransform re-applies the DPR scale so every drawing
       call uses ordinary CSS-pixel coordinates.                  */
    canvas.width  = Math.round(viewW * DPR);
    canvas.height = Math.round(viewH * DPR);
    canvas.style.width  = viewW + 'px';
    canvas.style.height = viewH + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    cols = Math.floor(viewW / CELL);
    rows = Math.floor(viewH / CELL);

    initGrid();
    initStreams();
  }

  /* Initialise every cell with ambient brightness and a random character */
  function initGrid() {
    const n = cols * rows;
    gChar   = new Array(n);
    gBright = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      gChar[i]   = rndChar();
      gBright[i] = AMBIENT + Math.random() * 0.04; // slight random spread
    }
  }

  /* Initialise stream heads; fraction of columns get active streams */
  function initStreams() {
    const frac = DENSITY_FRAC[density] ?? 1.0;
    streams       = new Array(cols);
    streamEnabled = new Array(cols);
    for (let c = 0; c < cols; c++) {
      const enabled     = Math.random() < frac;
      streamEnabled[c]  = enabled;
      const startY      = enabled
        ? -((Math.random() * rows) | 0)       // staggered start above viewport
        : -(rows + (Math.random() * rows | 0)); // start further above (delayed)
      streams[c] = { y: startY, prevY: startY, speed: 0.4 + Math.random() * 1.1 };
    }
  }

  /* ============================================================
     NEO OVERLAY
     ============================================================ */
  function createNeoEl() {
    neoEl = document.createElement('div');
    neoEl.style.cssText = [
      'position:fixed','top:50%','left:50%',
      'transform:translate(-50%,-50%)',
      'pointer-events:none','z-index:450',
      'font-family:monospace','font-size:clamp(1.1rem,2.5vw,1.8rem)',
      'letter-spacing:0.18em','text-align:center',
      'color:#00ff00','opacity:0','white-space:nowrap',
    ].join(';');
    document.body.appendChild(neoEl);
  }

  function updateNeo(s) {
    if (konamiActive) return;
    if (neoPhase === 'idle') {
      neoTimer -= s;
      if (neoTimer <= 0) {
        neoEl.textContent = NEO_MSGS[(Math.random() * NEO_MSGS.length) | 0];
        neoEl.style.color = '#00ff00';
        neoPhase = 'fadein'; neoOpacity = 0;
      }
    } else if (neoPhase === 'fadein') {
      neoOpacity = Math.min(1, neoOpacity + s);
      neoEl.style.opacity = neoOpacity;
      if (neoOpacity >= 1) { neoPhase = 'show'; neoTimer = 3.5; }
    } else if (neoPhase === 'show') {
      neoTimer -= s;
      if (neoTimer <= 0) neoPhase = 'fadeout';
    } else if (neoPhase === 'fadeout') {
      neoOpacity = Math.max(0, neoOpacity - s * 0.7);
      neoEl.style.opacity = neoOpacity;
      if (neoOpacity <= 0) { neoPhase = 'idle'; neoTimer = 90 + Math.random() * 90; }
    }
  }

  function triggerKonami() {
    konamiActive = true; konamiTimer = 3.0;
    neoEl.style.opacity = '1';
    neoEl.style.color   = '#ffffff';
    neoEl.textContent   = '// SYSTEM OVERRIDE //';
    neoPhase = 'idle'; neoTimer = 20;
  }

  function updateKonami(s) {
    if (!konamiActive) return;
    konamiTimer -= s;
    if (konamiTimer <= 0) { konamiActive = false; neoEl.style.opacity = '0'; }
  }

  /* ============================================================
     DRAW FRAME
     ============================================================ */
  function drawFrame(dt) {
    const dtSec = dt / 1000;
    const m     = speedMult();

    updateNeo(dtSec);
    updateKonami(dtSec);

    /* ── Step 1: clear entire canvas to pure black ─────────────
       No translucent overlay — the grid's numeric brightness
       values carry all fade state.                              */
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, viewW, viewH);

    /* ── Step 2: advance stream heads ─────────────────────────── */
    if (m > 0) {
      const advance = m * (dt / 16.667);   // rows per frame, normalised to 60 fps
      for (let c = 0; c < cols; c++) {
        if (!streamEnabled[c]) continue;
        const s = streams[c];

        s.y += s.speed * advance;

        /* Stamp every row the head passed through this frame  */
        const r0 = Math.floor(s.prevY) + 1;
        const r1 = Math.floor(s.y);
        for (let r = r0; r <= r1; r++) {
          if (r >= 0 && r < rows) {
            const idx    = c * rows + r;
            gChar[idx]   = rndChar();   // new random character at the head
            gBright[idx] = 1.0;         // maximum brightness
          }
        }
        s.prevY = s.y;

        /* Reset stream when its head exits the bottom of the grid */
        if (s.y > rows + 2) {
          s.y = s.prevY = -(1 + Math.random() * 4); // brief pause then restart
          s.speed = 0.4 + Math.random() * 1.1;
        }
      }
    }

    /* ── Step 3: render all cells + decay brightness ───────────
       Each cell is drawn exactly once per frame.
       No shadowBlur, no strokeText, no globalCompositeOperation.
       Font is set once outside the loop.                        */
    ctx.font         = FONT;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur   = 0;
    ctx.shadowColor  = 'transparent';

    for (let c = 0; c < cols; c++) {
      /* Horizontal centre of this column's cell (integer CSS px) */
      const cx = (c * CELL + (CELL >> 1)) | 0;

      /* Mouse repel — horizontal proximity */
      const dxM    = Math.abs(cx - mouseX);
      const repelX = dxM < 90 ? dxM / 90 : 1.0;

      for (let r = 0; r < rows; r++) {
        const idx = c * rows + r;
        const b   = gBright[idx];

        /* ── Render character ─────────────────────────────────── */
        if (b >= THRESH) {
          const cy = (r * CELL + (CELL >> 1)) | 0;

          /* Mouse repel — vertical proximity */
          const dyM    = Math.abs(cy - mouseY);
          const repelY = dyM < 90 ? dyM / 90 : 1.0;
          const repel  = repelX < repelY ? repelX : repelY;

          /* Quantise brightness to 256 levels for LUT lookup */
          const lutIdx = Math.min(255, (b * 255 + 0.5) | 0);
          ctx.fillStyle = konamiActive ? WHITE_LUT[lutIdx] : colorLUT[lutIdx];

          if (repel < 0.999) {
            ctx.globalAlpha = repel;
            ctx.fillText(gChar[idx], cx, cy);
            ctx.globalAlpha = 1.0;
          } else {
            ctx.fillText(gChar[idx], cx, cy);
          }
        }

        /* ── Decay brightness ─────────────────────────────────── */
        const nb = b * DECAY;
        gBright[idx] = nb < AMBIENT ? AMBIENT : nb;

        /* ── Slow background character mutation ───────────────── */
        /* Background cells (at or near the ambient floor) slowly
           change character, keeping the grid visually alive.     */
        if (nb <= AMBIENT + 0.01 && Math.random() < 0.002) {
          gChar[idx] = rndChar();
        }
      }
    }
  }

  /* ============================================================
     ANIMATION LOOP
     ============================================================ */
  function animate(ts) {
    const dt = Math.min(ts - lastTime, 100);
    lastTime = ts;
    drawFrame(dt);
    animId = requestAnimationFrame(animate);
  }

  function startLoop() {
    if (animId) return;
    lastTime = performance.now();
    animId   = requestAnimationFrame(animate);
  }

  function stopLoop() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
  }

  /* ============================================================
     INIT
     ============================================================ */
  function init() {
    buildColorLUT();
    resize();
    createNeoEl();
    if (REDUCED_MOTION) { drawFrame(0); return; }
    startLoop();
  }

  /* ============================================================
     EVENTS
     ============================================================ */
  document.addEventListener('visibilitychange', () => {
    document.hidden ? stopLoop() : startLoop();
  });

  document.addEventListener('matrixBgSpeedChange', startLoop);

  document.addEventListener('matrixGlowChange', e => {
    useGlow = e.detail === 'on';  // stored for compat; no visual glow applied per spec
  });

  document.addEventListener('matrixColorChange', e => {
    rainColor = e.detail;
    buildColorLUT();             // rebuild colour LUT for new theme
  });

  document.addEventListener('matrixCharsetChange', e => {
    charSetKey = e.detail;
    if (gChar) {                 // refresh all cached characters
      const n = cols * rows;
      for (let i = 0; i < n; i++) gChar[i] = rndChar();
    }
  });

  document.addEventListener('matrixDensityChange', e => {
    density = e.detail;
    initStreams();               // rebuild stream layout for new density
  });

  /* Mouse repel */
  document.addEventListener('mousemove',  e => { mouseX = e.clientX; mouseY = e.clientY; });
  document.addEventListener('mouseleave', ()  => { mouseX = -9999;   mouseY = -9999;     });

  /* Click: boost nearest column's stream */
  canvas.addEventListener('click', e => {
    let best = -1, bestDist = Infinity;
    for (let c = 0; c < cols; c++) {
      const cx = c * CELL + (CELL >> 1);
      const d  = Math.abs(cx - e.clientX);
      if (d < bestDist) { bestDist = d; best = c; }
    }
    if (best >= 0) {
      streamEnabled[best]  = true;
      streams[best].speed  = Math.min(4.0, (streams[best].speed || 1.0) * 1.8);
    }
  });

  /* Konami code */
  document.addEventListener('keydown', e => {
    konamiBuffer.push(e.key);
    if (konamiBuffer.length > KONAMI.length) konamiBuffer.shift();
    if (konamiBuffer.join(',') === KONAMI.join(',')) {
      konamiBuffer = [];
      triggerKonami();
    }
  });

  window.addEventListener('resize', resize);
  init();

})();
