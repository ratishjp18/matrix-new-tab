/* ============================================================
   Matrix New Tab — matrix.js
   ─────────────────────────────────────────────────────────────
   Pure black canvas, crisp 20 px monospace columns, bright
   #00FF00 leading character fading naturally to dark green then
   black.  No CRT effects, no scanlines, no green tint.

   Settings-driven (all via custom DOM events from app.js):
   • 15 colour themes   matrixColorChange
   • Language charset   matrixCharsetChange
   • Rain speed         data-bg-speed attribute / matrixBgSpeedChange
   • Column density     matrixDensityChange
   • Glow toggle        matrixGlowChange

   Extras preserved:
   • Mouse repel        columns fade near cursor
   • Click boost        nearest column accelerates
   • Konami code        ↑↑↓↓←→←→BA → system override
   • Neo messages       periodic Matrix quotes
   • Pauses on hidden   document visibilitychange
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     CHARACTER SETS  (language-aware)
     ============================================================ */
  const CHAR_SETS = {
    classic:    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    katakana:   'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ',
    cyrillic:   'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЮЯабвгдежзиклмнопрстуфхцчшщюя0123456789',
    arabic:     'ابتثجحخدذرزسشصضطظعغفقكلمنهوي٠١٢٣٤٥٦٧٨٩',
    greek:      'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψω0123456789',
    hebrew:     'אבגדהוזחטיכלמנסעפצקרשת0123456789',
    thai:       'กขคงจฉชซญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหอฮ0123456789',
    devanagari: 'अआइईउऊएऐओऔकखगघचछजझटठडढणतथदधनपफबभमयरलवशषसह0123456789',
    mixed:      'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEFZ@#$%&*',
    latin:      'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    numbers:    '0123456789+-*/=<>!?',
  };

  /* browser locale → charset key */
  const LANG_MAP = {
    ja: 'katakana',
    ru: 'cyrillic', uk: 'cyrillic', bg: 'cyrillic', sr: 'cyrillic', mk: 'cyrillic',
    ar: 'arabic',   fa: 'arabic',   ur: 'arabic',
    el: 'greek',
    he: 'hebrew',   yi: 'hebrew',
    th: 'thai',
    hi: 'devanagari', mr: 'devanagari', ne: 'devanagari',
  };
  const BROWSER_LANG = (navigator.language || 'en').split('-')[0].toLowerCase();

  /* ============================================================
     COLOUR THEMES  (15 total)
     Each theme exposes:
       head   — CSS colour string for the leading character
       near   — fn(alpha) → rgba for the 1–3 chars behind head
       mid    — fn(alpha, relDist) → rgba for mid-trail  (relDist: 0=head, 1=tail)
       dim    — fn(alpha, relDist) → rgba for tail section
       glow   — CSS colour used when glow is on
     ============================================================ */
  const THEMES = {
    green:   {
      head: '#00ff00',
      near: a    => `rgba(0,230,0,${a})`,
      mid:  (a,r) => `rgba(0,${~~(45+185*(1-r))},0,${a})`,
      dim:  (a,r) => `rgba(0,${~~(10+75*(1-r))},0,${a})`,
      glow: '#00ff00',
    },
    blue:    {
      head: '#00aaff',
      near: a    => `rgba(0,160,255,${a})`,
      mid:  (a,r) => `rgba(0,${~~(35+130*(1-r))},${~~(50+170*(1-r))},${a})`,
      dim:  (a,r) => `rgba(0,${~~(8+55*(1-r))},${~~(15+80*(1-r))},${a})`,
      glow: '#0088ff',
    },
    red:     {
      head: '#ff2020',
      near: a    => `rgba(255,32,32,${a})`,
      mid:  (a,r) => `rgba(${~~(50+185*(1-r))},0,0,${a})`,
      dim:  (a,r) => `rgba(${~~(10+70*(1-r))},0,0,${a})`,
      glow: '#ff0000',
    },
    white:   {
      head: '#ffffff',
      near: a    => `rgba(220,220,220,${a})`,
      mid:  (a,r) => { const v=~~(45+150*(1-r)); return `rgba(${v},${v},${v},${a})`; },
      dim:  (a,r) => { const v=~~(8+60*(1-r));   return `rgba(${v},${v},${v},${a})`; },
      glow: '#ffffff',
    },
    purple:  {
      head: '#cc55ff',
      near: a    => `rgba(170,0,255,${a})`,
      mid:  (a,r) => `rgba(${~~(28+95*(1-r))},0,${~~(55+165*(1-r))},${a})`,
      dim:  (a,r) => `rgba(${~~(7+35*(1-r))},0,${~~(18+68*(1-r))},${a})`,
      glow: '#8800ff',
    },
    cyan:    {
      head: '#00ffff',
      near: a    => `rgba(0,255,255,${a})`,
      mid:  (a,r) => `rgba(0,${~~(45+150*(1-r))},${~~(45+150*(1-r))},${a})`,
      dim:  (a,r) => `rgba(0,${~~(8+58*(1-r))},${~~(8+58*(1-r))},${a})`,
      glow: '#00ffff',
    },
    orange:  {
      head: '#ff8800',
      near: a    => `rgba(255,120,0,${a})`,
      mid:  (a,r) => `rgba(${~~(50+185*(1-r))},${~~(18+75*(1-r))},0,${a})`,
      dim:  (a,r) => `rgba(${~~(12+68*(1-r))},${~~(4+28*(1-r))},0,${a})`,
      glow: '#ff6600',
    },
    gold:    {
      head: '#ffd700',
      near: a    => `rgba(255,210,0,${a})`,
      mid:  (a,r) => `rgba(${~~(50+185*(1-r))},${~~(38+145*(1-r))},0,${a})`,
      dim:  (a,r) => `rgba(${~~(12+68*(1-r))},${~~(10+52*(1-r))},0,${a})`,
      glow: '#ffc800',
    },
    pink:    {
      head: '#ff44aa',
      near: a    => `rgba(255,0,128,${a})`,
      mid:  (a,r) => `rgba(${~~(50+155*(1-r))},0,${~~(28+78*(1-r))},${a})`,
      dim:  (a,r) => `rgba(${~~(12+58*(1-r))},0,${~~(7+32*(1-r))},${a})`,
      glow: '#ff0088',
    },
    teal:    {
      head: '#00ddb0',
      near: a    => `rgba(0,210,170,${a})`,
      mid:  (a,r) => `rgba(0,${~~(38+140*(1-r))},${~~(28+108*(1-r))},${a})`,
      dim:  (a,r) => `rgba(0,${~~(8+52*(1-r))},${~~(7+42*(1-r))},${a})`,
      glow: '#00c8aa',
    },
    lime:    {
      head: '#aaff00',
      near: a    => `rgba(140,255,0,${a})`,
      mid:  (a,r) => `rgba(${~~(28+88*(1-r))},${~~(48+170*(1-r))},0,${a})`,
      dim:  (a,r) => `rgba(${~~(6+32*(1-r))},${~~(12+62*(1-r))},0,${a})`,
      glow: '#80ff00',
    },
    sky:     {
      head: '#44ccff',
      near: a    => `rgba(0,180,255,${a})`,
      mid:  (a,r) => `rgba(0,${~~(38+118*(1-r))},${~~(48+152*(1-r))},${a})`,
      dim:  (a,r) => `rgba(0,${~~(8+42*(1-r))},${~~(14+58*(1-r))},${a})`,
      glow: '#00b4ff',
    },
    crimson: {
      head: '#ff2244',
      near: a    => `rgba(220,20,60,${a})`,
      mid:  (a,r) => `rgba(${~~(48+152*(1-r))},${~~(4+14*(1-r))},${~~(8+28*(1-r))},${a})`,
      dim:  (a,r) => `rgba(${~~(12+58*(1-r))},0,${~~(2+10*(1-r))},${a})`,
      glow: '#dc143c',
    },
    amber:   {
      head: '#ffb300',
      near: a    => `rgba(255,180,0,${a})`,
      mid:  (a,r) => `rgba(${~~(50+185*(1-r))},${~~(28+118*(1-r))},0,${a})`,
      dim:  (a,r) => `rgba(${~~(12+68*(1-r))},${~~(7+42*(1-r))},0,${a})`,
      glow: '#ffaa00',
    },
    violet:  {
      head: '#9944ff',
      near: a    => `rgba(140,40,230,${a})`,
      mid:  (a,r) => `rgba(${~~(28+78*(1-r))},${~~(8+28*(1-r))},${~~(48+140*(1-r))},${a})`,
      dim:  (a,r) => `rgba(${~~(7+28*(1-r))},${~~(2+8*(1-r))},${~~(16+56*(1-r))},${a})`,
      glow: '#8a2be2',
    },
  };

  /* ============================================================
     CONSTANTS
     ============================================================ */
  const FONT_SIZE    = 20;   // px — fixed for all columns (spec: 20–24 px)
  const SPEED_MULT   = { slow: 0.30, normal: 1.00, fast: 2.50 };
  const DENSITY_FRAC = { sparse: 0.35, normal: 0.65, dense: 1.00 };
  const KONAMI       = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown',
                        'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  const NEO_MSGS     = ['Wake up, Neo...','The Matrix has you.',
                        'Follow the white rabbit.','Knock, knock, Neo.','Free your mind.'];
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============================================================
     STATE
     ============================================================ */
  const canvas = document.getElementById('matrix');
  const ctx    = canvas.getContext('2d');

  let animId   = null;
  let lastTime = 0;
  let columns  = [];
  let colWidth = 12;   // measured in resize() — actual glyph advance width + 1 px gap

  /* -- Settings (driven by events from app.js) -- */
  let useGlow    = false;
  let rainColor  = 'green';
  let charSetKey = 'auto';
  let density    = 'dense';

  /* -- Mouse repel -- */
  let mouseX = -9999, mouseY = -9999;

  /* -- Konami -- */
  let konamiBuffer = [];
  let konamiActive = false;
  let konamiTimer  = 0;

  /* -- Neo overlay -- */
  let neoTimer   = 90 + Math.random() * 90;
  let neoPhase   = 'idle';   // idle | fadein | show | fadeout
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
    let key = charSetKey;
    if (key === 'auto') key = LANG_MAP[BROWSER_LANG] || 'classic';
    const ch = CHAR_SETS[key] || CHAR_SETS.classic;
    return ch[Math.floor(Math.random() * ch.length)];
  }

  /* ============================================================
     CANVAS / COLUMN SETUP
     ============================================================ */
  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    /* Measure the actual monospace glyph advance width so columns
       are packed exactly as tight as the font renders them.       */
    ctx.font = `${FONT_SIZE}px monospace`;
    colWidth  = Math.round(ctx.measureText('W').width) + 1;   // +1 px gap between columns

    initColumns();
  }

  function initColumns() {
    columns = [];
    const frac     = DENSITY_FRAC[density] ?? 1.0;
    const colCount = Math.floor(canvas.width / colWidth);

    for (let i = 0; i < colCount; i++) {
      if (Math.random() > frac) continue;
      columns.push(newColumn(i * colWidth));
    }
  }

  function newColumn(x) {
    const rows     = Math.ceil(canvas.height / FONT_SIZE);
    const trailLen = 10 + Math.floor(Math.random() * 20);    // 10–29 chars
    return {
      x,
      /* head row — negative means above viewport, advances downward */
      y:          Math.floor(Math.random() * -(rows + trailLen)),
      speed:      0.5 + Math.random() * 1.5,   // rows/frame at 60 fps, m=1
      trailLen,
      mutRate:    0.04 + Math.random() * 0.18,  // character mutation probability
      chars:      {},                            // cached glyphs keyed by row index
      boostTimer: 0,
      boost:      1.0,
    };
  }

  /* ============================================================
     NEO MESSAGE OVERLAY
     ============================================================ */
  function createNeoEl() {
    neoEl = document.createElement('div');
    neoEl.style.cssText = [
      'position:fixed', 'top:50%', 'left:50%',
      'transform:translate(-50%,-50%)',
      'pointer-events:none', 'z-index:450',
      'font-family:monospace', 'font-size:clamp(1.1rem,2.5vw,1.8rem)',
      'letter-spacing:0.18em', 'text-align:center',
      'color:#00ff00', 'opacity:0', 'white-space:nowrap',
    ].join(';');
    document.body.appendChild(neoEl);
  }

  function updateNeo(dtSec) {
    if (konamiActive) return;
    if (neoPhase === 'idle') {
      neoTimer -= dtSec;
      if (neoTimer <= 0) {
        neoEl.textContent = NEO_MSGS[Math.floor(Math.random() * NEO_MSGS.length)];
        neoEl.style.color = '#00ff00';
        neoPhase = 'fadein'; neoOpacity = 0;
      }
    } else if (neoPhase === 'fadein') {
      neoOpacity = Math.min(1, neoOpacity + dtSec);
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

  function triggerKonami() {
    konamiActive = true; konamiTimer = 3.0;
    neoEl.style.opacity = '1';
    neoEl.style.color   = '#ffffff';
    neoEl.textContent   = '// SYSTEM OVERRIDE //';
    neoPhase = 'idle'; neoTimer = 20;
  }

  function updateKonami(dtSec) {
    if (!konamiActive) return;
    konamiTimer -= dtSec;
    if (konamiTimer <= 0) { konamiActive = false; neoEl.style.opacity = '0'; }
  }

  /* ============================================================
     DRAW FRAME
     ============================================================ */
  function drawFrame(dt) {
    const dtSec = dt / 1000;
    const m     = speedMult();
    const theme = THEMES[rainColor] || THEMES.green;

    updateNeo(dtSec);
    updateKonami(dtSec);

    /* ── Step 1: overlay translucent BLACK to fade previous frame ──
       Pure rgba(0,0,0,f) — no green tint, no colour cast.
       At fast speed the fade is slightly stronger so trail length
       stays proportionally consistent with column velocity.          */
    const fade = 0.04 + m * 0.025;   // slow≈0.05  normal≈0.065  fast≈0.1025
    ctx.fillStyle = `rgba(0,0,0,${fade})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    /* ── Step 2: draw each column's trail + head ── */
    ctx.font      = `${FONT_SIZE}px monospace`;
    ctx.textAlign = 'left';
    ctx.shadowBlur = 0;

    columns.forEach(col => {
      const headRow = Math.floor(col.y);

      /* Mouse-repel: fade column near cursor (both axes) */
      const dxM    = Math.abs(col.x - mouseX);
      const repelX = dxM < 90 ? dxM / 90 : 1.0;

      for (let j = col.trailLen; j >= 0; j--) {
        const row = headRow - j;
        if (row < 0) continue;              // above viewport

        const py = row * FONT_SIZE;
        if (py > canvas.height + FONT_SIZE) continue;   // below viewport

        const dyM    = Math.abs(py - mouseY);
        const repelY = dyM < 90 ? dyM / 90 : 1.0;
        const repel  = Math.min(repelX, repelY);

        /* Randomise glyph occasionally to simulate changing data */
        if (!col.chars[row] || Math.random() < col.mutRate) {
          col.chars[row] = rndChar();
        }

        const relDist = j / col.trailLen;   // 0 = head, 1 = tail

        /* ── Colour per trail position ── */
        ctx.shadowBlur = 0;
        if (j === 0) {
          /* Leading character — maximum brightness */
          ctx.fillStyle = konamiActive ? '#ffffff' : theme.head;
          if (useGlow) { ctx.shadowColor = theme.head; ctx.shadowBlur = 7; }

        } else if (j <= 2) {
          /* 1–2 chars behind head — still very bright */
          const a = 0.95 - j * 0.15;
          ctx.fillStyle = konamiActive ? `rgba(255,255,255,${a})` : theme.near(a);

        } else if (relDist < 0.5) {
          /* Mid-trail — fading from bright to medium */
          const a = (1 - relDist * 0.70) * 0.80;
          ctx.fillStyle = konamiActive ? `rgba(190,190,190,${a})` : theme.mid(a, relDist);

        } else {
          /* Tail — dim, converging toward black */
          const a = (1 - relDist) * 0.55;
          ctx.fillStyle = konamiActive ? `rgba(90,90,90,${a})` : theme.dim(a, relDist);
        }

        ctx.globalAlpha = repel;
        ctx.fillText(col.chars[row], col.x, py);
        ctx.globalAlpha = 1;
        ctx.shadowBlur  = 0;
      }

      /* Boost decay (click-to-accelerate) */
      if (col.boostTimer > 0) {
        col.boostTimer = Math.max(0, col.boostTimer - dtSec);
        col.boost = 1 + col.boostTimer * 5;
      } else {
        col.boost = 1.0;
      }

      /* Advance head row — frame-rate independent */
      col.y += col.speed * col.boost * m * (dt / 16);

      /* Clean up stale char cache entries well above head */
      const oldRow = headRow - col.trailLen - 10;
      if (oldRow > 0) delete col.chars[oldRow];

      /* Reset column when its entire trail has scrolled below viewport */
      if (col.y > canvas.height / FONT_SIZE + col.trailLen + 5 && Math.random() > 0.97) {
        col.y        = -col.trailLen - Math.random() * 20;
        col.chars    = {};
        col.trailLen = 10 + Math.floor(Math.random() * 20);
      }
    });
    /* ── NO scanline pass, NO CRT overlay, NO colour tint ── */
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
    resize();
    createNeoEl();
    if (REDUCED_MOTION) { drawFrame(0); return; }
    startLoop();
  }

  /* ============================================================
     EVENTS
     ============================================================ */
  /* Pause when tab is hidden, resume when visible */
  document.addEventListener('visibilitychange', () => {
    document.hidden ? stopLoop() : startLoop();
  });

  /* Settings events (dispatched by app.js) */
  document.addEventListener('matrixBgSpeedChange', startLoop);
  document.addEventListener('matrixGlowChange',    e => {
    useGlow = e.detail === 'on';
    if (!useGlow) ctx.shadowBlur = 0;
  });
  document.addEventListener('matrixColorChange',   e => { rainColor  = e.detail; });
  document.addEventListener('matrixCharsetChange', e => {
    charSetKey = e.detail;
    columns.forEach(c => { c.chars = {}; });   // flush cached glyphs
  });
  document.addEventListener('matrixDensityChange', e => {
    density = e.detail;
    initColumns();
  });

  /* Mouse repel */
  document.addEventListener('mousemove',  e => { mouseX = e.clientX; mouseY = e.clientY; });
  document.addEventListener('mouseleave', ()  => { mouseX = -9999; mouseY = -9999; });

  /* Click: boost nearest column */
  canvas.addEventListener('click', e => {
    let best = null, bestDist = Infinity;
    columns.forEach(col => {
      const d = Math.abs(col.x - e.clientX);
      if (d < bestDist) { bestDist = d; best = col; }
    });
    if (best) best.boostTimer = 1.8;
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
