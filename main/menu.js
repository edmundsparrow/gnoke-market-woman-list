/**
 * menu.js — Gnoke Market Woman List
 * ─────────────────────────────────────────────────────────────
 * TO ADD A NEW PAGE:
 *   1. Add an entry to the PAGES array below.
 *   2. Create the HTML file in /main/ with a <section class="page active">
 *   3. The DB object is globally available — query however you need.
 *
 * Each page entry:
 *   { file: 'filename-without-extension', label: 'Menu label',
 *     icon: 'emoji', sub: 'Short description' }
 * ─────────────────────────────────────────────────────────────
 */
(function () {

  /* ══ EDIT THIS ARRAY TO ADD / REMOVE PAGES ══ */
  const PAGES = [
    { file: 'index',    label: 'Market Lists', icon: '🛒', sub: 'Your shopping trips'    },
    { file: 'history',  label: 'History',      icon: '📊', sub: 'Weekly & monthly spend' },
    { file: 'settings', label: 'Settings',     icon: '⚙️', sub: 'Data & preferences'     },
    { file: 'about',    label: 'About',        icon: 'ℹ️', sub: 'App info & author'      },
  ];
  /* ══════════════════════════════════════════ */

  const rawFile     = window.location.pathname.split('/').pop() || 'index';
  const currentFile = rawFile.replace(/\.html?$/i, '') || 'index';

  /* ── Styles ── */
  const style = document.createElement('style');
  style.textContent = `
    .hmenu-toggle {
      background: rgba(0,0,0,.06); border: 1px solid var(--border);
      color: var(--topbar-muted); width: 38px; height: 38px;
      border-radius: 10px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; transition: background .15s; flex-shrink: 0;
    }
    .hmenu-toggle:hover { background: var(--accent-dim); color: var(--accent); }

    .hmenu-overlay {
      display: none; position: fixed; inset: 0;
      background: rgba(0,0,0,.5); z-index: 9998;
      backdrop-filter: blur(3px);
    }
    .hmenu-overlay.open { display: block; }

    .hmenu-drawer {
      position: fixed; top: 0; left: -300px; width: 272px; height: 100%;
      background: var(--drawer-bg, #0f1a10);
      z-index: 9999; display: flex; flex-direction: column;
      transition: left .25s cubic-bezier(.4,0,.2,1);
      box-shadow: 6px 0 32px rgba(0,0,0,.35);
    }
    .hmenu-drawer.open { left: 0; }

    .hmenu-head {
      padding: 1.5rem 1.2rem 1rem;
      border-bottom: 1px solid rgba(255,255,255,.08);
      position: relative;
      background: linear-gradient(135deg, #1a3320, #0f1a10);
    }
    .hmenu-badge {
      display: inline-block;
      font-size: 9px; font-weight: 800; letter-spacing: 3px;
      color: rgba(255,255,255,.35); text-transform: uppercase;
      background: rgba(255,255,255,.06);
      padding: 3px 8px; border-radius: 20px;
      margin-bottom: 8px;
    }
    .hmenu-brand-name {
      font-size: 18px; font-weight: 800; color: white;
      font-family: var(--font-display, serif); line-height: 1.1;
    }
    .hmenu-brand-tagline {
      font-size: 10px; color: rgba(255,255,255,.3);
      font-family: var(--font-mono, monospace);
      margin-top: 4px; letter-spacing: .05em;
    }
    .hmenu-close {
      position: absolute; top: 14px; right: 14px;
      background: none; border: none; color: rgba(255,255,255,.4);
      font-size: 1.1rem; cursor: pointer; padding: 4px 8px;
      border-radius: 6px;
    }
    .hmenu-close:hover { background: rgba(255,255,255,.08); color: white; }

    .hmenu-nav { padding: 10px 0; flex: 1; overflow-y: auto; }

    .hmenu-nav-item {
      display: flex; align-items: center; gap: 12px;
      padding: 11px 18px; cursor: pointer;
      transition: background .12s; text-decoration: none;
      border-left: 3px solid transparent;
    }
    .hmenu-nav-item:hover { background: rgba(255,255,255,.05); }
    .hmenu-nav-item.active {
      background: rgba(46,180,120,.15);
      border-left-color: #4ecb85;
    }

    .hmenu-nav-icon { font-size: 1.15rem; width: 26px; text-align: center; }

    .hmenu-nav-label {
      display: block; font-size: 13.5px; font-weight: 600;
      color: white; font-family: var(--font-sans, sans-serif);
    }
    .hmenu-nav-sub {
      display: block; font-size: 10.5px;
      color: rgba(255,255,255,.32);
      font-family: var(--font-mono, monospace);
    }
    .hmenu-nav-item.active .hmenu-nav-label { color: #7de8a0; }

    .hmenu-divider {
      height: 1px; background: rgba(255,255,255,.07);
      margin: 6px 0;
    }

    .hmenu-footer {
      padding: 14px 20px;
      border-top: 1px solid rgba(255,255,255,.07);
    }
    .hmenu-version {
      font-family: var(--font-mono, monospace);
      font-size: 9.5px; letter-spacing: .12em;
      color: rgba(255,255,255,.2); text-transform: uppercase;
    }
  `;
  document.head.appendChild(style);

  /* ── DOM ── */
  const overlay = document.createElement('div');
  overlay.className = 'hmenu-overlay';

  const drawer = document.createElement('div');
  drawer.className = 'hmenu-drawer';
  drawer.innerHTML = `
    <div class="hmenu-head">
      <div class="hmenu-badge">Gnoke</div>
      <div class="hmenu-brand-name">Market Woman<br/>List</div>
      <div class="hmenu-brand-tagline">Offline-first · All data on device</div>
      <button class="hmenu-close" aria-label="Close menu">✕</button>
    </div>
    <nav class="hmenu-nav">
      ${PAGES.map((p, i) => {
        const href   = p.file === 'index' ? 'index.html' : `${p.file}.html`;
        const active = p.file === currentFile ? ' active' : '';
        const divider = i > 0 && p.divider ? '<div class="hmenu-divider"></div>' : '';
        return `${divider}<a class="hmenu-nav-item${active}" href="${href}">
          <span class="hmenu-nav-icon">${p.icon}</span>
          <div>
            <span class="hmenu-nav-label">${p.label}</span>
            <span class="hmenu-nav-sub">${p.sub}</span>
          </div>
        </a>`;
      }).join('')}
    </nav>
    <div class="hmenu-footer">
      <div class="hmenu-version">Market Woman List · v1.0</div>
    </div>`;

  document.body.appendChild(overlay);
  document.body.appendChild(drawer);

  /* ── Toggle button in header ── */
  const header = document.querySelector('header, #topbar');
  if (header) {
    const toggle = document.createElement('button');
    toggle.className = 'hmenu-toggle';
    toggle.setAttribute('aria-label', 'Open menu');
    toggle.innerHTML = '☰';
    header.insertBefore(toggle, header.firstChild);
    toggle.addEventListener('click', open);
  }

  function open()  { overlay.classList.add('open'); drawer.classList.add('open'); document.body.style.overflow = 'hidden'; }
  function close() { overlay.classList.remove('open'); drawer.classList.remove('open'); document.body.style.overflow = ''; }

  overlay.addEventListener('click', close);
  drawer.querySelector('.hmenu-close').addEventListener('click', close);

})();
