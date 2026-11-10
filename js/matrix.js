/* ============================================================
   Matrix New Tab — matrix.js
   Animated code rain background:
     - Katakana + Latin + Number characters
     - Multi-speed columns with trail fade
     - Bright head character with phosphor glow
     - Random character mutations
     - Occasional bright highlight columns
     - Subtle CRT scanline overlay
   Pauses when tab is hidden.
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     CONFIG
     ============================================================ */
  const FONT_SIZE  = 16;    // px per character cell
  const CHARS      = 'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEFZ@#$%&*';

  const SPEED_MULT = { slow: 0.30, normal: 1.00, fast: 2.50 };

  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* ============================================================ */

  const canvas = document.getElementById('matrix');
  const ctx    = canvas.getContext('2d');

  let animId   = null;
  let lastTime = 0;
  let columns  = [];
  let useGlow  = true;

  /* ----------------------------------------------------------
     Speed helper
  ---------------------------------------------------------- */
  function mult() {
    if (REDUCED_MOTION) return 0;
    const s = document.documentElement.dataset.bgSpeed || 'fast';
    return SPEED_MULT[s] ?? 1.0;
  }

  /* ----------------------------------------------------------
     Random character
  ---------------------------------------------------------- */
  function rndChar() {
    return CHARS[Math.floor(Math.random() * CHARS.length)];
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
     Initialise column data
  ---------------------------------------------------------- */
  function initColumns() {
    const numCols = Math.floor(canvas.width / FONT_SIZE);
    columns = Array.from({ length: numCols }, () => newColumn());
  }

  function newColumn() {
    const trailLen = 8 + Math.floor(Math.random() * 24);
    return {
      y:        Math.random() * -(canvas.height / FONT_SIZE) * 1.5, // start above screen
      speed:    0.35 + Math.random() * 1.40,
      trailLen,
      bright:   Math.random() > 0.88,   // ~12% are highlight columns
      mutRate:  0.06 + Math.random() * 0.22,
      chars:    {},                       // row → char string
    };
  }

  /* ----------------------------------------------------------
     Draw one frame
  ---------------------------------------------------------- */
  function drawFrame(dt) {
    const m = mult();

    /* -- Fade to black (creates the trail decay effect) -- */
    const fade = Math.max(0.03, 0.055 / Math.max(m, 0.3));
    ctx.fillStyle = `rgba(0,0,0,${fade})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font      = `${FONT_SIZE - 2}px monospace`;
    ctx.textAlign = 'left';

    columns.forEach((col, i) => {
      const headRow = Math.floor(col.y);
      const x       = i * FONT_SIZE;

      /* -- Draw trail from bottom of trail up to head -- */
      for (let j = col.trailLen; j >= 0; j--) {
        const row = headRow - j;
        if (row < 0) continue;
        const py = row * FONT_SIZE;
        if (py > canvas.height + FONT_SIZE) continue;

        // Mutate character
        if (!col.chars[row] || Math.random() < col.mutRate) {
          col.chars[row] = rndChar();
        }

        const relDist = j / col.trailLen; // 0 = head, 1 = tail

        if (j === 0) {
          // ── Head: near-white with strong glow ──
          ctx.fillStyle = col.bright ? '#e8ffe8' : '#c0ffc0';
          if (useGlow) {
            ctx.shadowColor = '#00ff41';
            ctx.shadowBlur  = col.bright ? 18 : 10;
          }
        } else if (j === 1) {
          // ── Just behind head: full green ──
          ctx.fillStyle = '#00ff41';
          if (useGlow) { ctx.shadowColor = '#00ff41'; ctx.shadowBlur = 7; }
        } else if (j < 5) {
          // ── Near trail: bright green fading ──
          const a = 1 - (j / 5) * 0.45;
          ctx.fillStyle = `rgba(0, 255, 65, ${a})`;
          if (useGlow) { ctx.shadowColor = '#00ff41'; ctx.shadowBlur = 4; }
        } else {
          // ── Deep trail: dark green, no glow ──
          const a = Math.pow(1 - relDist, 2.2) * 0.80;
          const g = Math.floor(45 + 210 * (1 - relDist));
          ctx.fillStyle   = `rgba(0, ${g}, 18, ${a})`;
          ctx.shadowBlur  = 0;
        }

        ctx.fillText(col.chars[row], x, py);
        ctx.shadowBlur = 0;
      }

      // Advance column
      col.y += col.speed * m * (dt / 16);

      // Memory cleanup — remove old entries well behind the trail
      const oldRow = headRow - col.trailLen - 8;
      if (oldRow > 0) delete col.chars[oldRow];

      // Reset once fully below screen
      if (col.y * FONT_SIZE > canvas.height + col.trailLen * FONT_SIZE * 2) {
        if (Math.random() > 0.97) {
          Object.assign(col, newColumn());
        }
      }
    });

    // CRT scanline overlay
    ctx.fillStyle = 'rgba(0,0,0,0.028)';
    for (let y = 0; y < canvas.height; y += 4) {
      ctx.fillRect(0, y, canvas.width, 1);
    }
  }

  /* ----------------------------------------------------------
     Animation loop (delta-time, frame-rate independent)
  ---------------------------------------------------------- */
  function animate(ts) {
    const dt = Math.min(ts - lastTime, 100);
    lastTime = ts;
    drawFrame(dt);
    animId = requestAnimationFrame(animate);
  }

  /* ----------------------------------------------------------
     Start / stop
  ---------------------------------------------------------- */
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

  document.addEventListener('matrixGlowChange', (e) => {
    useGlow = e.detail === 'on';
    // Reset shadowBlur on the canvas immediately when glow is turned off
    if (!useGlow) ctx.shadowBlur = 0;
  });

  window.addEventListener('resize', resize);

  init();
})();
