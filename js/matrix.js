/* ============================================================
   Matrix New Tab — matrix.js  (enhanced)
   ─────────────────────────────────────────────────────────────
   Features
   ────────
   • Depth rain — columns have random depth (font size 11–18 px,
     varying speed & opacity) for a parallax feel
   • 5 colour themes  — green / blue / red / white / purple
   • 4 character sets — mixed / katakana / latin / numbers
   • 3 density levels — sparse / normal / dense
   • Phosphor glow    — toggle on/off
   • CRT flicker      — random brief screen dimming
   • Mouse repel      — rain fades around the cursor
   • Click accelerate — clicking a column makes it rush down
   • Konami code      — ↑↑↓↓←→←→BA → system override flash
   • Neo messages     — periodic Matrix quotes fade in & out
   • Pauses when tab is hidden
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     CONFIG
     ============================================================ */
  const CHAR_SETS = {
    mixed:    'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEFZ@#$%&*',
    katakana: 'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ',
    latin:    'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    numbers:  '0123456789+-*/=<>!?',
  };

  const THEMES = {
    green:  { head: '#c0ffc0', near: a => `rgba(0,255,65,${a})`,        trail: (a,r) => { const g=~~(40+215*(1-r)); return `rgba(0,${g},18,${a})`; },              glow: '#00ff41', scan: 'rgba(0,255,65,0.028)'   },
    blue:   { head: '#c0dcff', near: a => `rgba(0,160,255,${a})`,       trail: (a,r) => { const g=~~(40+215*(1-r)); return `rgba(0,${g},255,${a})`; },             glow: '#0088ff', scan: 'rgba(0,160,255,0.025)'  },
    red:    { head: '#ffc0c0', near: a => `rgba(255,32,32,${a})`,        trail: (a,r) => { const g=~~(30+200*(1-r)); return `rgba(${g},0,0,${a})`; },              glow: '#ff0000', scan: 'rgba(255,32,32,0.025)'   },
    white:  { head: '#ffffff', near: a => `rgba(210,210,210,${a})`,      trail: (a,r) => { const g=~~(30+190*(1-r)); return `rgba(${g},${g},${g},${a})`; },        glow: '#ffffff', scan: 'rgba(200,200,200,0.022)' },
    purple: { head: '#e0c0ff', near: a => `rgba(160,0,255,${a})`,        trail: (a,r) => { const g=~~(30+200*(1-r)); return `rgba(${~~(g*.5)},0,${g},${a})`; },   glow: '#8800ff', scan: 'rgba(140,0,255,0.025)'   },
  };

  const SPEED_MULT   = { slow: 0.30, normal: 1.00, fast: 2.50 };
  const DENSITY_FRAC = { sparse: 0.35, normal: 0.65, dense: 1.00 };

  const KONAMI   = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  const NEO_MSGS = ['Wake up, Neo...', 'The Matrix has you.', 'Follow the white rabbit.', 'Knock, knock, Neo.', 'Free your mind.'];

  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* ============================================================ */

  const canvas = document.getElementById('matrix');
  const ctx    = canvas.getContext('2d');

  let animId   = null;
  let lastTime = 0;
  let columns  = [];

  /* -- Configurable state (driven by settings events) -- */
  let useGlow    = true;
  let rainColor  = 'green';
  let charSetKey = 'mixed';
  let density    = 'normal';

  /* -- Mouse -- */
  let mouseX = -9999, mouseY = -9999;

  /* -- Click-to-accelerate -- */
  // stored per-column in col.boostTimer

  /* -- Konami -- */
  let konamiBuffer = [];
  let konamiActive = false;
  let konamiTimer  = 0;

  /* -- CRT flicker -- */
  let flickerTimer  = 8 + Math.random() * 20;
  let flickerActive = false;
  let flickerFrames = 0;

  /* -- Neo message -- */
  let neoTimer   = 90 + Math.random() * 90;
  let neoPhase   = 'idle';          // idle | fadein | show | fadeout
  let neoOpacity = 0;
  let neoEl      = null;

  /* ----------------------------------------------------------
     Speed helper
  ---------------------------------------------------------- */
  function mult() {
    if (REDUCED_MOTION) return 0;
    const s = document.documentElement.dataset.bgSpeed || 'fast';
    return SPEED_MULT[s] ?? 1.0;
  }

  /* ----------------------------------------------------------
     Random character from current set
  ---------------------------------------------------------- */
  function rndChar() {
    const ch = CHAR_SETS[charSetKey] || CHAR_SETS.mixed;
    return ch[Math.floor(Math.random() * ch.length)];
  }

  /* ----------------------------------------------------------
     Canvas resize
  ---------------------------------------------------------- */
  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    initColumns();
  }

  /* ----------------------------------------------------------
     Initialise columns with depth variation
  ---------------------------------------------------------- */
  function initColumns() {
    columns = [];
    const W    = canvas.width;
    const frac = DENSITY_FRAC[density] ?? 0.65;
    const BASE_COL = 16; // base column width

    for (let xi = 0; xi < Math.floor(W / BASE_COL); xi++) {
      if (Math.random() > frac) continue;
      columns.push(newColumn(xi * BASE_COL));
    }
  }

  function newColumn(baseX) {
    // Depth: 0 = far/background, 1 = near/foreground
    const depth      = Math.random();
    const fontSize   = Math.round(11 + depth * 7);        // 11–18 px
    const opacitySc  = 0.40 + depth * 0.60;               // dimmer far away
    const speedBase  = (0.30 + depth * 1.10) * (0.80 + Math.random() * 0.40);
    const trailLen   = 8 + Math.floor(Math.random() * 24);

    return {
      x:          baseX + (Math.random() - 0.5) * 4,      // slight x jitter
      y:          Math.random() * -(canvas.height / fontSize) * 1.8,
      speed:      speedBase,
      trailLen,
      bright:     Math.random() > 0.88,
      mutRate:    0.06 + Math.random() * 0.22,
      chars:      {},
      fontSize,
      opacitySc,
      depth,
      boostTimer: 0,
      boost:      1.0,
    };
  }

  /* ----------------------------------------------------------
     Neo message overlay
  ---------------------------------------------------------- */
  function createNeoEl() {
    neoEl = document.createElement('div');
    neoEl.style.cssText = [
      'position:fixed', 'top:50%', 'left:50%',
      'transform:translate(-50%,-50%)',
      'pointer-events:none', 'z-index:450',
      'font-family:monospace', 'font-size:clamp(1.1rem,2.5vw,1.8rem)',
      'letter-spacing:0.18em', 'text-align:center',
      'color:#00ff41',
      'text-shadow:0 0 16px #00ff41,0 0 32px #00ff41',
      'opacity:0', 'transition:none',
      'white-space:nowrap',
    ].join(';');
    document.body.appendChild(neoEl);
  }

  function updateNeo(dtSec) {
    if (konamiActive) return; // konami takes over the element

    if (neoPhase === 'idle') {
      neoTimer -= dtSec;
      if (neoTimer <= 0) {
        neoEl.textContent = NEO_MSGS[Math.floor(Math.random() * NEO_MSGS.length)];
        neoEl.style.color      = '#00ff41';
        neoEl.style.textShadow = '0 0 16px #00ff41,0 0 32px #00ff41';
        neoPhase = 'fadein'; neoOpacity = 0;
      }
    } else if (neoPhase === 'fadein') {
      neoOpacity = Math.min(1, neoOpacity + dtSec * 1.0);
      neoEl.style.opacity = neoOpacity;
      if (neoOpacity >= 1) { neoPhase = 'show'; neoTimer = 3.5; }
    } else if (neoPhase === 'show') {
      neoTimer -= dtSec;
      if (neoTimer <= 0) neoPhase = 'fadeout';
    } else if (neoPhase === 'fadeout') {
      neoOpacity = Math.max(0, neoOpacity - dtSec * 0.7);
      neoEl.style.opacity = neoOpacity;
      if (neoOpacity <= 0) { neoPhase = 'idle'; neoTimer = 90 + Math.random() * 90; }
    }
  }

  /* ----------------------------------------------------------
     CRT flicker
  ---------------------------------------------------------- */
  function updateFlicker(dtSec) {
    if (REDUCED_MOTION) return;
    if (!flickerActive) {
      flickerTimer -= dtSec;
      if (flickerTimer <= 0) {
        flickerActive = true;
        flickerFrames = 1 + Math.floor(Math.random() * 3);
        canvas.style.opacity = (0.55 + Math.random() * 0.30).toString();
        flickerTimer = 10 + Math.random() * 25;
      }
    } else {
      if (--flickerFrames <= 0) { flickerActive = false; canvas.style.opacity = '1'; }
    }
  }

  /* ----------------------------------------------------------
     Konami effect
  ---------------------------------------------------------- */
  function triggerKonami() {
    konamiActive = true;
    konamiTimer  = 3.0;
    neoEl.style.opacity    = '1';
    neoEl.style.color      = '#ffffff';
    neoEl.style.textShadow = '0 0 20px #fff,0 0 60px #fff,0 0 100px #fff';
    neoEl.textContent      = '// SYSTEM OVERRIDE //';
    neoPhase = 'idle'; neoTimer = 20; // reset neo after konami
  }

  function updateKonami(dtSec) {
    if (!konamiActive) return;
    konamiTimer -= dtSec;
    if (konamiTimer <= 0) {
      konamiActive = false;
      neoEl.style.opacity = '0';
    }
  }

  /* ----------------------------------------------------------
     Draw frame
  ---------------------------------------------------------- */
  function drawFrame(dt) {
    const dtSec = dt / 1000;
    const m     = mult();
    const theme = THEMES[rainColor] || THEMES.green;

    // Update effects
    updateNeo(dtSec);
    updateFlicker(dtSec);
    updateKonami(dtSec);

    // Fade to black (trail decay)
    const fade = Math.max(0.03, 0.055 / Math.max(m, 0.3));
    ctx.fillStyle = `rgba(0,0,0,${fade})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sort back-to-front by depth so deeper columns render first
    columns.sort((a, b) => a.depth - b.depth);

    columns.forEach(col => {
      const { fontSize: fs, opacitySc, bright } = col;
      const headRow = Math.floor(col.y);

      ctx.font      = `${fs - 2}px monospace`;
      ctx.textAlign = 'left';

      // Mouse repel: compute proximity factor (0 = fully repelled, 1 = unaffected)
      const dxM = Math.abs(col.x - mouseX);
      const repelX = dxM < 90 ? dxM / 90 : 1.0;

      for (let j = col.trailLen; j >= 0; j--) {
        const row = headRow - j;
        if (row < 0) continue;
        const py = row * fs;
        if (py > canvas.height + fs) continue;

        // Mouse repel on Y axis
        const dyM    = Math.abs(py - mouseY);
        const repelY = dyM < 90 ? dyM / 90 : 1.0;
        const repel  = Math.min(repelX, repelY);

        // Mutate character
        if (!col.chars[row] || Math.random() < col.mutRate) col.chars[row] = rndChar();

        const relDist = j / col.trailLen; // 0 = head, 1 = tail

        if (j === 0) {
          ctx.fillStyle = konamiActive ? '#ffffff' : (bright ? theme.head : theme.near(0.9 * opacitySc));
          if (useGlow) { ctx.shadowColor = konamiActive ? '#fff' : theme.glow; ctx.shadowBlur = bright ? 18 : 10; }
        } else if (j === 1) {
          ctx.fillStyle = konamiActive ? '#eeeeee' : theme.near(0.9 * opacitySc);
          if (useGlow) { ctx.shadowColor = konamiActive ? '#fff' : theme.glow; ctx.shadowBlur = 7; }
        } else if (j < 5) {
          const a = (1 - (j / 5) * 0.45) * opacitySc;
          ctx.fillStyle = konamiActive ? `rgba(230,230,230,${a})` : theme.near(a);
          if (useGlow && j < 3) { ctx.shadowColor = konamiActive ? '#fff' : theme.glow; ctx.shadowBlur = 3; }
          else ctx.shadowBlur = 0;
        } else {
          const a = Math.pow(1 - relDist, 2.2) * 0.80 * opacitySc;
          const g = ~~(40 + 215 * (1 - relDist));
          ctx.fillStyle = konamiActive ? `rgba(${g},${g},${g},${a})` : theme.trail(a, relDist);
          ctx.shadowBlur = 0;
        }

        ctx.globalAlpha = repel;
        ctx.fillText(col.chars[row], col.x, py);
        ctx.globalAlpha = 1;
        ctx.shadowBlur  = 0;
      }

      // Boost decay
      if (col.boostTimer > 0) {
        col.boostTimer = Math.max(0, col.boostTimer - dtSec);
        col.boost = 1 + col.boostTimer * 5;
      } else {
        col.boost = 1.0;
      }

      // Advance
      col.y += col.speed * col.boost * m * (dt / 16);

      // Memory cleanup
      const oldRow = headRow - col.trailLen - 10;
      if (oldRow > 0) delete col.chars[oldRow];

      // Reset off-screen
      if (col.y * fs > canvas.height + col.trailLen * fs * 2 && Math.random() > 0.97) {
        col.y        = -col.trailLen - Math.random() * 30;
        col.chars    = {};
        col.trailLen = 8 + Math.floor(Math.random() * 24);
        col.bright   = Math.random() > 0.88;
      }
    });

    // CRT scanline overlay
    ctx.fillStyle = theme.scan;
    for (let y = 0; y < canvas.height; y += 4) {
      ctx.fillRect(0, y, canvas.width, 1);
    }
  }

  /* ----------------------------------------------------------
     Animation loop
  ---------------------------------------------------------- */
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

  /* ----------------------------------------------------------
     Init
  ---------------------------------------------------------- */
  function init() {
    resize();
    createNeoEl();
    if (REDUCED_MOTION) { drawFrame(0); return; }
    startLoop();
  }

  /* ----------------------------------------------------------
     Events
  ---------------------------------------------------------- */
  document.addEventListener('visibilitychange', () => {
    document.hidden ? stopLoop() : startLoop();
  });

  document.addEventListener('matrixBgSpeedChange', startLoop);

  document.addEventListener('matrixGlowChange',    e => { useGlow    = e.detail === 'on'; if (!useGlow) ctx.shadowBlur = 0; });
  document.addEventListener('matrixColorChange',   e => { rainColor  = e.detail; });
  document.addEventListener('matrixCharsetChange', e => { charSetKey = e.detail; columns.forEach(c => { c.chars = {}; }); });
  document.addEventListener('matrixDensityChange', e => { density    = e.detail; initColumns(); });

  // Mouse tracking for repel
  document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });
  document.addEventListener('mouseleave', () => { mouseX = -9999; mouseY = -9999; });

  // Click: accelerate nearest column
  canvas.addEventListener('click', e => {
    let best = null, bestDist = Infinity;
    columns.forEach(col => { const d = Math.abs(col.x - e.clientX); if (d < bestDist) { bestDist = d; best = col; } });
    if (best) { best.boostTimer = 1.8; }
  });

  // Konami code listener
  document.addEventListener('keydown', e => {
    konamiBuffer.push(e.key);
    if (konamiBuffer.length > KONAMI.length) konamiBuffer.shift();
    if (konamiBuffer.join(',') === KONAMI.join(',')) { konamiBuffer = []; triggerKonami(); }
  });

  window.addEventListener('resize', resize);
  init();
})();
