/* ============================================================
   Matrix Digital Rain — state-based grid renderer  v3
   ─────────────────────────────────────────────────────────────
   RENDERING MODEL
   ───────────────
   gChar[c*rows+r]   — character stored at each grid cell
   gBright[c*rows+r] — brightness [0,1] stored at each cell

   Every frame:
     1. Canvas cleared to pure #000000
     2. Active stream heads advance; current head cell is stamped
        to brightness 1.0 every frame (not just on cell entry)
     3. Every cell rendered exactly once at its brightness
     4. Every brightness multiplied by DECAY (fades toward black)

   Cells START at 0 (black). Visible characters only appear when
   a stream passes through. No static pre-filled background grid.

   WARM START: half the streams are seeded mid-screen with
   pre-computed trail brightnesses so animation is visible
   immediately on page load.

   Settings events (from app.js):
     matrixColorChange   matrixCharsetChange  matrixDensityChange
     matrixGlowChange    matrixBgSpeedChange
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     CONSTANTS
     ============================================================ */
  const CELL  = 25;    // grid cell size, CSS px (width AND height)
  const FSIZE = 24;    // font-size, CSS px
  const FONT  = `400 ${FSIZE}px Consolas, "Courier New", monospace`;

  const DECAY = 0.92;  // per-frame brightness multiplier (0.92 → ~40-cell trail at 60fps)
  const FLOOR = 0.06;  // brightness floor applied ONLY to previously-activated cells
                       // keeps a faint residue after stream passes (≈ #000F00 for green)
  const THRESH = 0.04; // below this, skip fillText (pure black)

  /* ============================================================
     CHARACTER SETS
     ============================================================ */
  const CHAR_SETS = {
    classic: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    english: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
  };

  /* ============================================================
     COLOUR THEMES — [R, G, B] at brightness = 1.0
     colour at b = rgb( R*b, G*b, B*b )
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

  /* Grayscale LUT for Konami override — fixed, computed once */
  const WHITE_LUT = Array.from({ length: 256 }, (_, i) => `rgb(${i},${i},${i})`);

  const SPEED_MULT   = { slow: 0.30, normal: 1.00, fast: 2.50 };
  const DENSITY_FRAC = { sparse: 0.40, normal: 0.70, dense: 1.00 };
  const KONAMI       = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown',
                        'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  const NEO_MSGS     = ['Wake up, Neo...','The Matrix has you.',
                        'Follow the white rabbit.','Knock, knock, Neo.','Free your mind.'];
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============================================================
     CANVAS
     ============================================================ */
  const canvas = document.getElementById('matrix');
  const ctx    = canvas.getContext('2d');
  const DPR    = window.devicePixelRatio || 1;

  let animId = null, lastTime = 0;
  let viewW = 0, viewH = 0, cols = 0, rows = 0;

  /* ============================================================
     GRID STATE
     Index formula: c * rows + r
     ============================================================ */
  let gChar   = [];    // character string per cell
  let gBright = null;  // Float32Array, brightness per cell

  /* ============================================================
     STREAM STATE
     ============================================================ */
  let streams       = [];   // { y, speed, active }
  let streamEnabled = [];   // boolean per column

  /* ============================================================
     COLOUR LUT  (256 entries, rebuilt on theme change)
     ============================================================ */
  let colorLUT = [];

  /* ============================================================
     SETTINGS
     ============================================================ */
  let rainColor  = 'green';   // fixed — colour selector removed from settings
  let charSetKey = 'classic';
  let density    = 'dense';
  let useGlow    = false;   // kept for event compat; not applied per spec

  /* ============================================================
     EXTRAS
     ============================================================ */
  let konamiBuffer = [], konamiActive = false, konamiTimer = 0;
  let neoTimer = 90 + Math.random() * 90, neoPhase = 'idle',
      neoOpacity = 0, neoEl = null;

  /* ============================================================
     HELPERS
     ============================================================ */
  function speedMult() {
    if (REDUCED_MOTION) return 0;
    const raw = document.documentElement.dataset.bgSpeed || '80';
    const n   = parseFloat(raw);
    // Numeric value from slider (1–100) → multiplier 0.025–2.5
    if (!isNaN(n)) return n * 0.025;
    // Legacy named values (backward compat)
    return SPEED_MULT[raw] ?? 1.0;
  }

  function rndChar() {
    const ch = CHAR_SETS[charSetKey] || CHAR_SETS.classic;
    return ch[(Math.random() * ch.length) | 0];
  }

  function buildColorLUT() {
    const [mr, mg, mb] = THEME_MAX[rainColor] || THEME_MAX.green;
    colorLUT = new Array(256);
    for (let i = 0; i < 256; i++) {
      const b = i / 255;
      colorLUT[i] =
        `rgb(${(mr*b+.5)|0},${(mg*b+.5)|0},${(mb*b+.5)|0})`;
    }
  }

  /* Resolve density fraction from either numeric slider value or legacy name */
  function densityFrac() {
    const n = parseFloat(density);
    if (!isNaN(n)) return Math.max(0.01, Math.min(1.0, n / 100));
    return DENSITY_FRAC[density] ?? 0.65;
  }
  /* ============================================================
     RESIZE / GRID / STREAMS
     ============================================================ */
  function resize() {
    viewW = window.innerWidth;
    viewH = window.innerHeight;

    // Physical backing pixels = logical CSS pixels × DPR
    canvas.width  = Math.round(viewW * DPR);
    canvas.height = Math.round(viewH * DPR);
    canvas.style.width  = viewW + 'px';
    canvas.style.height = viewH + 'px';
    // All subsequent draw calls use CSS-pixel coordinates
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    cols = Math.floor(viewW / CELL);
    rows = Math.floor(viewH / CELL);

    initGrid();
    initStreams();
  }

  function initGrid() {
    const n = cols * rows;
    gChar   = new Array(n);
    gBright = new Float32Array(n);
    // ALL cells start at brightness=0 (pure black).
    // Characters are assigned now so they're ready when a stream
    // stamps them, and for the warm-start pre-seeding below.
    for (let i = 0; i < n; i++) {
      gChar[i]   = rndChar();
      gBright[i] = 0;
    }
  }

  function initStreams() {
    const frac = densityFrac();
    streams       = new Array(cols);
    streamEnabled = new Array(cols);

    for (let c = 0; c < cols; c++) {
      const enabled = Math.random() < frac;
      streamEnabled[c] = enabled;

      if (!enabled) {
        streams[c] = { y: -(rows * 2), speed: 0.4 + Math.random() * 1.1 };
        continue;
      }

      const speed = 0.4 + Math.random() * 1.1;

      /* ── Warm start ──────────────────────────────────────────
         Half the columns seed their stream mid-screen so the
         animation is visually active from frame 1. The other
         half start above the viewport for natural stagger.      */
      if (Math.random() < 0.5) {
        // Start somewhere in the visible area
        const headRow = (Math.random() * rows) | 0;
        streams[c] = { y: headRow, speed };

        // Pre-paint the trail above the head with decayed brightness
        for (let r = headRow; r >= 0; r--) {
          const dist  = headRow - r;             // 0 at head, increases upward
          const b     = Math.pow(DECAY, dist);   // brightness falls off with distance
          if (b < THRESH) break;                 // too dim, stop pre-seeding
          const idx = c * rows + r;
          gBright[idx] = b;
          // char already randomised in initGrid
        }
      } else {
        // Start above viewport — full natural drop
        streams[c] = {
          y:     -((Math.random() * rows) | 0),
          speed,
        };
      }
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
    const dtSec   = dt / 1000;
    const m       = speedMult();

    updateNeo(dtSec);
    updateKonami(dtSec);

    /* ── 1. Clear to pure black ─────────────────────────────── */
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, viewW, viewH);

    /* ── 2. Advance streams ─────────────────────────────────── */
    if (m > 0) {
      const advance = m * (dt / 16.667);  // rows this frame, normalised to 60 fps

      for (let c = 0; c < cols; c++) {
        if (!streamEnabled[c]) continue;
        const s = streams[c];

        const prevRow = Math.floor(s.y);
        s.y += s.speed * advance;
        const currRow = Math.floor(s.y);

        /* Stamp every newly entered row */
        for (let r = prevRow + 1; r <= currRow; r++) {
          if (r >= 0 && r < rows) {
            const idx    = c * rows + r;
            gChar[idx]   = rndChar();
            gBright[idx] = 1.0;
          }
        }

        /* Always keep the CURRENT head cell at maximum brightness.
           Without this re-stamp, the head flickers as DECAY applies
           between frames whenever the head doesn't cross a row boundary. */
        if (currRow >= 0 && currRow < rows) {
          gBright[c * rows + currRow] = 1.0;
        }

        /* Reset when head exits bottom */
        if (s.y > rows + 2) {
          s.y     = -(1 + Math.random() * 3);   // very short pause, restart quickly
          s.speed = 0.4 + Math.random() * 1.1;
        }
      }
    }

    /* ── 3. Render cells + decay ─────────────────────────────── */
    ctx.font         = FONT;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur   = 0;
    ctx.shadowColor  = 'transparent';

    for (let c = 0; c < cols; c++) {
      const cx = (c * CELL + (CELL >> 1)) | 0;  // integer cell centre x

      for (let r = 0; r < rows; r++) {
        const idx = c * rows + r;
        const b   = gBright[idx];

        /* ── Render ─────────────────────────────────────────── */
        if (b >= THRESH) {
          const cy = (r * CELL + (CELL >> 1)) | 0; // integer cell centre y

          const lutIdx = Math.min(255, (b * 255 + 0.5) | 0);
          ctx.fillStyle = konamiActive ? WHITE_LUT[lutIdx] : colorLUT[lutIdx];
          ctx.fillText(gChar[idx], cx, cy);
        }

        /* ── Decay brightness ─────────────────────────────────
           • If cell was never activated (b === 0): stays black.
           • If cell was activated: decay toward FLOOR, not to 0.
             This keeps a faint residue after the stream leaves —
             the "dim background" texture builds up naturally.    */
        if (b > 0) {
          const nb = b * DECAY;
          gBright[idx] = nb < FLOOR ? FLOOR : nb;
        }

        /* ── Occasional character mutation in mid-trail ──────── */
        if (b > THRESH && b < 0.8 && Math.random() < 0.012) {
          gChar[idx] = rndChar();
        }
      }
    }
  }

  /* ============================================================
     LOOP
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
  document.addEventListener('matrixGlowChange', e => { useGlow = e.detail === 'on'; });
  document.addEventListener('matrixColorChange', e => { rainColor = e.detail; buildColorLUT(); });
  document.addEventListener('matrixCharsetChange', e => {
    charSetKey = e.detail;
    if (gChar) { const n = cols*rows; for (let i=0;i<n;i++) gChar[i]=rndChar(); }
  });
  document.addEventListener('matrixDensityChange', e => { density = e.detail; initStreams(); });

  canvas.addEventListener('click', e => {
    let best = -1, bestDist = Infinity;
    for (let c = 0; c < cols; c++) {
      const d = Math.abs(c * CELL + (CELL >> 1) - e.clientX);
      if (d < bestDist) { bestDist = d; best = c; }
    }
    if (best >= 0) {
      streamEnabled[best] = true;
      streams[best].speed = Math.min(4, (streams[best].speed || 1) * 1.8);
    }
  });

  document.addEventListener('keydown', e => {
    konamiBuffer.push(e.key);
    if (konamiBuffer.length > KONAMI.length) konamiBuffer.shift();
    if (konamiBuffer.join(',') === KONAMI.join(',')) { konamiBuffer=[]; triggerKonami(); }
  });

  window.addEventListener('resize', resize);
  init();

})();
