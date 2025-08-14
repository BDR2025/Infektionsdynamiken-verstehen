// js/core/app.js  (ES-Modul)

// Deine bestehenden Imports
import { loadPartials } from './includes.js';
import { getMode, applyMode, bindModeToggle } from './mode.js';
import { bindLinks, markActiveNav, bindEdgeKeys } from './router.js';

// ---------- UI Helpers (neu) ----------

// Hamburger-Overlay (Topnav) verdrahten
function wireMenu(root = document) {
  const open = root.getElementById('navOpen');
  const menu = root.getElementById('navMenu');

  // Falls Header (noch) nicht geladen ist, später erneut versuchen
  if (!open || !menu) return;

  // Doppeltbindungen vermeiden
  if (open.dataset.wired === '1' && menu.dataset.wired === '1') return;
  open.dataset.wired = '1';
  menu.dataset.wired = '1';

  const setOpen = (on) => {
    open.setAttribute('aria-expanded', on ? 'true' : 'false');
    menu.hidden = !on;
    document.body.classList.toggle('no-scroll', on);
  };

  open.addEventListener('click', () => {
    const next = open.getAttribute('aria-expanded') !== 'true';
    setOpen(next);
  });

  // Klick auf die dunkle Fläche schließt
  menu.addEventListener('click', (e) => {
    if (e.target === menu) setOpen(false);
  });

  // ESC schließt
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  }, { passive: true });
}

// Bottom-Nav aktiv markieren (ergänzt markActiveNav aus router.js)
function markActiveBottomNav() {
  const page = document.body?.getAttribute('data-page');
  if (!page) return;

  document.querySelectorAll('.site-bottom-nav .tab')
    .forEach(a => {
      a.classList.toggle('active', a.dataset.nav === page);
    });
}

// Gemeinsame Initialisierung (idempotent)
function initCommon() {
  // Modus anwenden & Toggle binden
  applyMode(getMode());
  bindModeToggle();

  // SPA-Navigation etc.
  bindLinks();
  markActiveNav();
  bindEdgeKeys();

  // Header-Topnav & Bottom-Nav
  wireMenu(document);
  markActiveBottomNav();
}

// ---------- Page Loader (dein Code, minimal angepasst) ----------

async function initPageScript() {
  const page = document.body.dataset.page || '';
  const map = {
    'index':      () => import('../pages/page-index.js'),
    'model-sir':  () => import('../pages/page-model-sir.js'),
    'model-seir': () => import('../pages/page-model-seir.js'),
    'model-sis':  () => import('../pages/page-model-sis.js'),
    'model-sirs': () => import('../pages/page-model-sirs.js'),
    'model-sirv': () => import('../pages/page-model-sirv.js'),
    'modelle':    () => import('../pages/page-modelle.js'),
  };
  const key = Object.keys(map).find(k => page.startsWith(k));
  if (key) {
    const mod = await map[key]();
    // Falls das Modul eine init-Funktion bietet
    if (typeof mod.init === 'function') mod.init();
  }
}

// ---------- Boot-Sequenz ----------

async function boot() {
  // 1) Header/Footer via Includes laden
  await loadPartials();

  // 2) Gemeinsame Init (Modus, Router, Menüs, Bottom-Nav)
  initCommon();

  // 3) Seitenspezifisches Script nachladen
  await initPageScript();
}

// Beim ersten DOM-Ready starten
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

// Falls Includes (Header/Footer) später erneut injiziert werden, neu verdrahten
document.addEventListener('includes:done', () => {
  initCommon();
});
