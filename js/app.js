/* ============================================================
   Matrix New Tab — app.js
   Multi-page layout: 2 rows × 6 cols per page.
   Wheel / keyboard / dot navigation between pages.
   ============================================================ */

(function () {
  'use strict';

  const STORAGE_VERSION = 2;   // bumped — new settings added
  const COLS            = 6;
  const ROWS            = 2;
  const PAGE_SIZE       = COLS * ROWS;
  const P1_COUNT        = 12;

  /* ----------------------------------------------------------
     Page 1 apps
  ---------------------------------------------------------- */
  const PAGE1_APPS = [
    { id: 'google',     name: 'Google',      url: 'https://www.google.com',          icon: 'https://logo.clearbit.com/google.com',                                                                                            glowColor: 'rgba(66,133,244,0.55)' },
    { id: 'gmail',      name: 'Gmail',       url: 'https://mail.google.com',         icon: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://mail.google.com&size=256',    glowColor: 'rgba(234,67,53,0.55)'  },
    { id: 'twitter',    name: 'Twitter',     url: 'https://x.com',                   icon: 'https://logo.clearbit.com/x.com',                                                                                                 glowColor: 'rgba(200,200,200,0.40)'},
    { id: 'chatgpt',    name: 'ChatGPT',     url: 'https://chat.openai.com',         icon: 'https://logo.clearbit.com/openai.com',                                                                                            glowColor: 'rgba(16,163,127,0.55)' },
    { id: 'gemini',     name: 'Gemini',      url: 'https://gemini.google.com',       icon: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://gemini.google.com&size=256', glowColor: 'rgba(66,133,244,0.55)' },
    { id: 'claude',     name: 'Claude',      url: 'https://claude.ai',               icon: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://claude.ai&size=256',         glowColor: 'rgba(212,107,64,0.55)' },
    { id: 'strava',     name: 'Strava',      url: 'https://www.strava.com/dashboard',icon: 'https://logo.clearbit.com/strava.com',                                                                                            glowColor: 'rgba(252,76,2,0.55)'   },
    { id: 'speedtest',  name: 'Speedtest',   url: 'https://www.speedtest.net/',      icon: 'https://logo.clearbit.com/speedtest.net',                                                                                         glowColor: 'rgba(0,185,150,0.55)'  },
    { id: 'youtube',    name: 'YouTube',     url: 'https://www.youtube.com',         icon: 'https://logo.clearbit.com/youtube.com',                                                                                           glowColor: 'rgba(255,48,48,0.55)'  },
    { id: 'github',     name: 'GitHub',      url: 'https://github.com',              icon: 'https://logo.clearbit.com/github.com',                                                                                            glowColor: 'rgba(0,255,65,0.55)'   },
    { id: 'applemusic', name: 'Apple Music', url: 'https://music.apple.com',         icon: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://music.apple.com&size=256',   glowColor: 'rgba(252,60,68,0.55)'  },
    { id: 'incognito',  name: 'Incognito',   url: '', type: 'incognito',              icon: 'app-icons/fallback.svg',                                                                                                          glowColor: 'rgba(0,255,65,0.55)'   },
  ];

  /* ----------------------------------------------------------
     Overflow apps
  ---------------------------------------------------------- */
  const OVERFLOW_APPS = [
    { id: 'hotstar',    name: 'JioHotstar',       url: 'https://www.jiohotstar.com',    icon: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://www.jiohotstar.com&size=256', glowColor: 'rgba(59,130,246,0.55)'  },
    { id: 'prime',      name: 'Prime Video',      url: 'https://www.primevideo.com',    icon: 'https://logo.clearbit.com/primevideo.com',                                                                                          glowColor: 'rgba(0,168,225,0.55)'   },
    { id: 'plex',       name: 'Plex',             url: 'https://app.plex.tv/desktop/', icon: 'https://logo.clearbit.com/plex.tv',                                                                                                  glowColor: 'rgba(229,160,13,0.55)'  },
    { id: 'appletv',    name: 'Apple TV+',        url: 'https://tv.apple.com',          icon: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://tv.apple.com&size=256',         glowColor: 'rgba(255,255,255,0.35)' },
    { id: 'sonyliv',    name: 'SonyLIV',          url: 'https://www.sonyliv.com',       icon: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://www.sonyliv.com&size=256',      glowColor: 'rgba(0,112,206,0.55)'   },
    { id: 'zee5',       name: 'ZEE5',             url: 'https://www.zee5.com',          icon: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://www.zee5.com&size=256',         glowColor: 'rgba(100,28,161,0.55)'  },
    { id: 'netflix',    name: 'Netflix',          url: 'https://www.netflix.com',       icon: 'https://logo.clearbit.com/netflix.com',                                                                                             glowColor: 'rgba(229,9,20,0.55)'    },
    { id: 'flipkart',   name: 'Flipkart',         url: 'https://www.flipkart.com',      icon: 'https://logo.clearbit.com/flipkart.com',                                                                                            glowColor: 'rgba(247,148,30,0.55)'  },
    { id: 'amazon',     name: 'Amazon',           url: 'https://www.amazon.in',         icon: 'https://logo.clearbit.com/amazon.in',                                                                                               glowColor: 'rgba(255,153,0,0.55)'   },
    { id: 'ajio',       name: 'AJIO',             url: 'https://www.ajio.com',          icon: 'https://logo.clearbit.com/ajio.com',                                                                                                glowColor: 'rgba(220,38,38,0.55)'   },
    { id: 'decathlon',  name: 'Decathlon',        url: 'https://www.decathlon.in',      icon: 'https://logo.clearbit.com/decathlon.in',                                                                                            glowColor: 'rgba(0,130,200,0.55)'   },
    { id: 'souled',     name: 'The Souled Store', url: 'https://www.thesouledstore.com',icon: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://www.thesouledstore.com&size=256',glowColor: 'rgba(239,68,68,0.55)'   },
    { id: 'pvr',        name: 'PVR Cinemas',      url: 'https://www.pvrcinemas.com',    icon: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://www.pvrcinemas.com&size=256',    glowColor: 'rgba(220,38,38,0.55)'   },
    { id: 'district',   name: 'District',         url: 'https://www.district.in/',      icon: 'https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://www.district.in&size=256',      glowColor: 'rgba(0,255,65,0.60)'    },
    { id: 'proxy',      name: 'Proxy',            url: 'https://www.proxysite.com',     icon: 'https://logo.clearbit.com/proxysite.com',                                                                                           glowColor: 'rgba(0,255,65,0.60)'    },
    { id: 'linkedin',   name: 'LinkedIn',         url: 'https://www.linkedin.com/',     icon: 'https://logo.clearbit.com/linkedin.com',                                                                                            glowColor: 'rgba(10,102,194,0.55)'  },
  ];

  /* ----------------------------------------------------------
     State
  ---------------------------------------------------------- */
  let tileSize        = 'large';
  let bgSpeed         = 'fast';
  let glowEnabled     = 'on';
  let rainColor       = 'green';
  let charSetKey      = 'mixed';
  let density         = 'normal';
  let tileLabels      = 'hover';
  let currentPage     = 0;
  let totalPages      = 0;
  let isTransitioning = false;
  let navCooldown     = false;

  /* ----------------------------------------------------------
     Storage
  ---------------------------------------------------------- */
  function loadSettings() {
    return new Promise(resolve => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.sync.get(['tileSize','bgSpeed','glowEnabled','rainColor','charSetKey','density','tileLabels','storageVersion'], data => {
          if (data.storageVersion !== STORAGE_VERSION) {
            tileSize = 'large'; bgSpeed = 'fast'; glowEnabled = 'on';
            rainColor = 'green'; charSetKey = 'mixed'; density = 'normal'; tileLabels = 'hover';
            chrome.storage.sync.clear(() => chrome.storage.sync.set({ tileSize, bgSpeed, glowEnabled, rainColor, charSetKey, density, tileLabels, storageVersion: STORAGE_VERSION }));
          } else {
            tileSize   = data.tileSize   || 'large';
            bgSpeed    = data.bgSpeed    || 'fast';
            glowEnabled= data.glowEnabled|| 'on';
            rainColor  = data.rainColor  || 'green';
            charSetKey = data.charSetKey || 'mixed';
            density    = data.density    || 'normal';
            tileLabels = data.tileLabels || 'hover';
          }
          resolve();
        });
      } else { resolve(); }
    });
  }

  function saveSettings() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.set({ tileSize, bgSpeed, glowEnabled, rainColor, charSetKey, density, tileLabels, storageVersion: STORAGE_VERSION });
    }
  }

  /* ----------------------------------------------------------
     Build all pages
  ---------------------------------------------------------- */
  function buildPages() {
    const overflowPages = Math.ceil(OVERFLOW_APPS.length / PAGE_SIZE);
    totalPages = 1 + overflowPages;

    const track = document.getElementById('pages-track');
    track.innerHTML = '';
    track.style.transition = 'none';
    track.style.transform  = 'translateY(0)';

    track.appendChild(createPageEl(PAGE1_APPS, PAGE_SIZE - P1_COUNT, 0));
    for (let p = 0; p < overflowPages; p++) {
      track.appendChild(createPageEl(OVERFLOW_APPS.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE), 0, p + 1));
    }

    renderPageDots();
    goToPage(currentPage, false);
  }

  function createPageEl(apps, emptyCount, pageIndex) {
    const section = document.createElement('section');
    section.className = 'page';
    section.setAttribute('aria-label', `Page ${pageIndex + 1}`);

    const grid = document.createElement('div');
    grid.className = `page-grid page-grid--${tileSize}`;
    grid.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;

    apps.forEach((app, i) => grid.appendChild(createTileEl(app, i)));
    for (let i = 0; i < emptyCount; i++) {
      const s = document.createElement('div');
      s.className = 'tile tile--empty';
      s.setAttribute('aria-hidden', 'true');
      grid.appendChild(s);
    }

    section.appendChild(grid);
    return section;
  }

  function createTileEl(app, index) {
    const col   = index % COLS;
    const row   = Math.floor(index / COLS);
    const delay = `${Math.round(Math.abs(col - (COLS - 1) / 2) * 50 + row * 90)}ms`;
    const floatDur   = (3.0 + (index * 0.31 % 1.8)).toFixed(2);
    const floatDelay = (index * 0.43 % 4.0).toFixed(2);

    if (app.type === 'incognito') {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.style.setProperty('--glow-color', app.glowColor);
      tile.style.animationDelay = delay;
      tile.style.setProperty('--float-dur',   `${floatDur}s`);
      tile.style.setProperty('--float-delay', `${floatDelay}s`);
      tile.setAttribute('role', 'button'); tile.setAttribute('tabindex', '0');
      tile.setAttribute('aria-label', 'Open Incognito window');
      tile.innerHTML = `<div class="tile__icon-wrap"><img class="tile__icon" src="${escapeAttr(app.icon)}" alt="" draggable="false"></div><span class="tile__tooltip">${app.name}</span>`;
      const launch = () => {
        if (typeof chrome !== 'undefined' && chrome.windows) {
          chrome.windows.create({ incognito: true }, () => {
            if (chrome.runtime.lastError) alert('Enable "Allow in Incognito" for Matrix New Tab in chrome://extensions.');
          });
        }
      };
      tile.addEventListener('click', launch);
      tile.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); launch(); } });
      return tile;
    }

    const tile = document.createElement('a');
    tile.className = 'tile';
    tile.href      = app.url;
    tile.style.setProperty('--glow-color', app.glowColor);
    tile.style.animationDelay = delay;
    tile.style.setProperty('--float-dur',   `${floatDur}s`);
    tile.style.setProperty('--float-delay', `${floatDelay}s`);
    tile.setAttribute('aria-label', app.name);

    const domain    = getDomain(app.url);
    const iconSrc   = app.icon || `https://logo.clearbit.com/${domain}`;
    const fallback1 = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${domain}&size=256`;

    tile.innerHTML = `
      <div class="tile__icon-wrap">
        <img class="tile__icon" src="${escapeAttr(iconSrc)}" alt="" draggable="false"
             data-fallback1="${escapeAttr(fallback1)}" data-fallback2="app-icons/fallback.svg">
      </div>
      <span class="tile__tooltip">${app.name}</span>`;
    return tile;
  }

  /* ----------------------------------------------------------
     Page navigation
  ---------------------------------------------------------- */
  function goToPage(index, animate = true) {
    const track = document.getElementById('pages-track');
    const isWrap = animate && (
      (index === 0 && currentPage === totalPages - 1) ||
      (index === totalPages - 1 && currentPage === 0)
    );

    if (isWrap) {
      isTransitioning = navCooldown = true;
      track.style.transition = 'opacity 0.18s ease';
      track.style.opacity    = '0';
      setTimeout(() => {
        track.style.transition = 'none';
        track.style.transform  = `translateY(${-index * 100}vh)`;
        currentPage = index; updatePageDots();
        void track.getBoundingClientRect();
        track.style.transition = 'opacity 0.18s ease';
        track.style.opacity    = '1';
        setTimeout(() => { track.style.opacity = ''; track.style.transition = ''; isTransitioning = navCooldown = false; }, 220);
      }, 200);
      return;
    }

    currentPage = Math.max(0, Math.min(index, totalPages - 1));

    if (animate) {
      const pulse = document.createElement('div');
      pulse.className = 'page-warp-pulse';
      document.body.appendChild(pulse);
      requestAnimationFrame(() => {
        pulse.classList.add('visible');
        setTimeout(() => { pulse.classList.remove('visible'); pulse.addEventListener('transitionend', () => pulse.remove(), { once: true }); }, 200);
      });
      track.classList.add('pages-track--sliding');
      track.style.transition = 'transform 0.35s cubic-bezier(0.77,0,0.175,1)';
      isTransitioning = true;
      setTimeout(() => { track.classList.remove('pages-track--sliding'); isTransitioning = false; }, 400);
    } else {
      track.style.transition = 'none';
    }

    track.style.transform = `translateY(${-currentPage * 100}vh)`;
    updatePageDots();
  }

  function navigate(dir) {
    if (isTransitioning || navCooldown) return;
    let next = currentPage + dir;
    if (next >= totalPages) next = 0;
    if (next < 0) next = totalPages - 1;
    spawnScanLine(dir);
    navCooldown = true;
    setTimeout(() => { navCooldown = false; }, 450);
    goToPage(next);
  }

  function setupNavigation() {
    document.body.style.overflow = 'hidden';
    document.addEventListener('wheel', e => { if (Math.abs(e.deltaY) < 10) return; e.preventDefault(); navigate(e.deltaY > 0 ? 1 : -1); }, { passive: false });
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); navigate(1); }
      if (e.key === 'ArrowUp'   || e.key === 'PageUp')   { e.preventDefault(); navigate(-1); }
      if (e.ctrlKey && e.key >= '1' && e.key <= '9') { e.preventDefault(); goToPage(parseInt(e.key, 10) - 1); }
    });
    let touchStartY = 0;
    document.addEventListener('touchstart', e => { touchStartY = e.touches[0].clientY; }, { passive: true });
    document.addEventListener('touchend',   e => { const d = touchStartY - e.changedTouches[0].clientY; if (Math.abs(d) < 40) return; navigate(d > 0 ? 1 : -1); }, { passive: true });
  }

  /* ----------------------------------------------------------
     Page dots
  ---------------------------------------------------------- */
  function renderPageDots() {
    const nav = document.getElementById('page-dots');
    nav.innerHTML = '';
    for (let i = 0; i < totalPages; i++) {
      const dot = document.createElement('button');
      dot.className = 'page-dot' + (i === currentPage ? ' page-dot--active' : '');
      dot.setAttribute('aria-label', `Go to page ${i + 1}`);
      dot.addEventListener('click', () => goToPage(i));
      nav.appendChild(dot);
    }
    updatePageCounter();
  }

  function updatePageDots() {
    document.querySelectorAll('.page-dot').forEach((dot, i) => dot.classList.toggle('page-dot--active', i === currentPage));
    updatePageCounter();
  }

  function updatePageCounter() {
    const el = document.getElementById('page-counter');
    if (el) el.textContent = `${currentPage + 1} / ${totalPages}`;
  }

  /* ----------------------------------------------------------
     Settings panel
  ---------------------------------------------------------- */
  const settingsToggle = document.getElementById('settings-toggle');
  const settingsPanel  = document.getElementById('settings-panel');
  const settingsClose  = document.getElementById('settings-close');

  const openPanel  = () => { settingsPanel.classList.add('open');    settingsToggle.classList.add('panel-open');    settingsToggle.setAttribute('aria-expanded','true');  };
  const closePanel = () => { settingsPanel.classList.remove('open'); settingsToggle.classList.remove('panel-open'); settingsToggle.setAttribute('aria-expanded','false'); };

  settingsToggle.addEventListener('click', () => settingsPanel.classList.contains('open') ? closePanel() : openPanel());
  settingsClose.addEventListener('click', closePanel);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && settingsPanel.classList.contains('open')) closePanel(); });
  document.addEventListener('click', e => { if (settingsPanel.classList.contains('open') && !settingsPanel.contains(e.target) && !settingsToggle.contains(e.target)) closePanel(); });

  // Tile size
  document.querySelectorAll('.size-btn').forEach(btn => btn.addEventListener('click', () => {
    tileSize = btn.dataset.size;
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    saveSettings(); buildPages();
  }));

  // Rain speed
  document.querySelectorAll('.bgspeed-btn').forEach(btn => btn.addEventListener('click', () => {
    bgSpeed = btn.dataset.bgspeed;
    document.querySelectorAll('.bgspeed-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.documentElement.dataset.bgSpeed = bgSpeed;
    document.dispatchEvent(new CustomEvent('matrixBgSpeedChange'));
    saveSettings();
  }));

  // Rain colour
  document.querySelectorAll('.raincolor-btn').forEach(btn => btn.addEventListener('click', () => {
    rainColor = btn.dataset.color;
    document.querySelectorAll('.raincolor-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.dispatchEvent(new CustomEvent('matrixColorChange', { detail: rainColor }));
    saveSettings();
  }));

  // Character set
  document.querySelectorAll('.charset-btn').forEach(btn => btn.addEventListener('click', () => {
    charSetKey = btn.dataset.charset;
    document.querySelectorAll('.charset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.dispatchEvent(new CustomEvent('matrixCharsetChange', { detail: charSetKey }));
    saveSettings();
  }));

  // Density
  document.querySelectorAll('.density-btn').forEach(btn => btn.addEventListener('click', () => {
    density = btn.dataset.density;
    document.querySelectorAll('.density-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.dispatchEvent(new CustomEvent('matrixDensityChange', { detail: density }));
    saveSettings();
  }));

  // Glow toggle
  document.querySelectorAll('.glow-btn').forEach(btn => btn.addEventListener('click', () => {
    glowEnabled = btn.dataset.glow;
    document.querySelectorAll('.glow-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.dispatchEvent(new CustomEvent('matrixGlowChange', { detail: glowEnabled }));
    saveSettings();
  }));

  // Tile labels
  document.querySelectorAll('.labels-btn').forEach(btn => btn.addEventListener('click', () => {
    tileLabels = btn.dataset.labels;
    document.querySelectorAll('.labels-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyTileLabels();
    saveSettings();
  }));

  // Reset
  document.getElementById('reset-btn').addEventListener('click', () => {
    if (!confirm('Reset all settings to defaults?')) return;
    tileSize = 'large'; bgSpeed = 'fast'; glowEnabled = 'on';
    rainColor = 'green'; charSetKey = 'mixed'; density = 'normal'; tileLabels = 'hover';
    saveSettings(); applySettingsToUI(); buildPages();
  });

  function applySettingsToUI() {
    document.querySelectorAll('.size-btn').forEach(b => b.classList.toggle('active', b.dataset.size === tileSize));
    document.querySelectorAll('.bgspeed-btn').forEach(b => b.classList.toggle('active', b.dataset.bgspeed === bgSpeed));
    document.querySelectorAll('.glow-btn').forEach(b => b.classList.toggle('active', b.dataset.glow === glowEnabled));
    document.querySelectorAll('.raincolor-btn').forEach(b => b.classList.toggle('active', b.dataset.color === rainColor));
    document.querySelectorAll('.charset-btn').forEach(b => b.classList.toggle('active', b.dataset.charset === charSetKey));
    document.querySelectorAll('.density-btn').forEach(b => b.classList.toggle('active', b.dataset.density === density));
    document.querySelectorAll('.labels-btn').forEach(b => b.classList.toggle('active', b.dataset.labels === tileLabels));
    document.documentElement.dataset.bgSpeed = bgSpeed;
    document.dispatchEvent(new CustomEvent('matrixGlowChange',    { detail: glowEnabled }));
    document.dispatchEvent(new CustomEvent('matrixColorChange',   { detail: rainColor   }));
    document.dispatchEvent(new CustomEvent('matrixCharsetChange', { detail: charSetKey  }));
    document.dispatchEvent(new CustomEvent('matrixDensityChange', { detail: density     }));
    applyTileLabels();
  }

  function applyTileLabels() {
    document.body.classList.toggle('labels-always', tileLabels === 'always');
  }

  /* ----------------------------------------------------------
     Icon fallback chain
  ---------------------------------------------------------- */
  document.body.addEventListener('error', e => {
    const img = e.target;
    if (img.tagName !== 'IMG') return;
    if (!img.dataset.failed1 && img.dataset.fallback1) { img.dataset.failed1 = '1'; img.src = img.dataset.fallback1; }
    else if (!img.dataset.failed2 && img.dataset.fallback2) { img.dataset.failed2 = '1'; img.src = img.dataset.fallback2; }
  }, true);

  /* ----------------------------------------------------------
     Helpers
  ---------------------------------------------------------- */
  function getDomain(url) { try { return new URL(url).hostname.replace(/^www\./,''); } catch { return url; } }
  function escapeAttr(s)  { return String(s).replace(/"/g,'&quot;'); }
  function spawnScanLine(dir) {
    const line = document.createElement('div');
    line.className = `page-scan-line page-scan-line--${dir > 0 ? 'down' : 'up'}`;
    document.body.appendChild(line);
    line.addEventListener('animationend', () => line.remove(), { once: true });
  }

  /* ----------------------------------------------------------
     Quick search
  ---------------------------------------------------------- */
  (function setupQuickSearch() {
    const overlay = document.getElementById('quick-search');
    const input   = document.getElementById('quick-search-input');
    const open    = ch => { overlay.classList.add('visible'); input.value = ch || ''; setTimeout(() => input.focus(), 20); };
    const close   = ()  => { overlay.classList.remove('visible'); input.blur(); };
    const submit  = ()  => { const q = input.value.trim(); if (q) window.location.href = `https://www.google.com/search?q=${encodeURIComponent(q)}`; else close(); };
    document.addEventListener('keydown', e => {
      if (overlay.classList.contains('visible') || document.getElementById('settings-panel').classList.contains('open')) return;
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) open(e.key);
    });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } if (e.key === 'Escape') { e.preventDefault(); close(); } });
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  })();

  /* ----------------------------------------------------------
     Idle glow
  ---------------------------------------------------------- */
  (function setupIdleGlow() {
    let idleTimer, glowInterval;
    const startGlow = () => {
      glowInterval = setInterval(() => {
        const activePage = document.querySelectorAll('.page')[currentPage];
        if (!activePage) return;
        const tiles = [...activePage.querySelectorAll('.tile:not(.tile--empty):not(.tile--idle-glow)')];
        if (!tiles.length) return;
        const tile = tiles[Math.floor(Math.random() * tiles.length)];
        tile.classList.add('tile--idle-glow');
        tile.addEventListener('animationend', () => tile.classList.remove('tile--idle-glow'), { once: true });
      }, 1800);
    };
    const resetIdle = () => { clearTimeout(idleTimer); clearInterval(glowInterval); idleTimer = setTimeout(startGlow, 5000); };
    document.addEventListener('mousemove', resetIdle, { passive: true });
    document.addEventListener('keydown',   resetIdle, { passive: true });
    document.addEventListener('wheel',     resetIdle, { passive: true });
    resetIdle();
  })();

  /* ----------------------------------------------------------
     First-run scroll hint
  ---------------------------------------------------------- */
  function showScrollHint() {
    if (localStorage.getItem('matrixHinted') || totalPages < 2) return;
    localStorage.setItem('matrixHinted', '1');
    const hint = document.createElement('div');
    hint.className   = 'scroll-hint';
    hint.textContent = '↕  Scroll to switch pages';
    document.body.appendChild(hint);
    setTimeout(() => hint.classList.add('visible'), 800);
    setTimeout(() => { hint.classList.remove('visible'); hint.addEventListener('transitionend', () => hint.remove(), { once: true }); }, 4000);
  }

  /* ----------------------------------------------------------
     Boot
  ---------------------------------------------------------- */
  async function init() {
    await loadSettings();
    applySettingsToUI();
    buildPages();
    setupNavigation();
    showScrollHint();
    startClock();
  }

  /* ----------------------------------------------------------
     Digital clock
  ---------------------------------------------------------- */
  function startClock() {
    const timeEl = document.getElementById('clock-time');
    const dateEl = document.getElementById('clock-date');
    if (!timeEl || !dateEl) return;

    const DAYS   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
    const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const pad    = n => String(n).padStart(2, '0');

    function tick() {
      const now = new Date();
      timeEl.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      dateEl.textContent = `${DAYS[now.getDay()]} ${pad(now.getDate())} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
    }
    tick();
    setInterval(tick, 1000);
  }

  init();
})();
