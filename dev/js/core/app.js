// js/core/app.js  (ES-Modul, zusammengeführt)

import { loadPartials } from './includes.js';
import { getMode, applyMode, bindModeToggle } from './mode.js';
// Router ist optional – Datei existiert bei dir, Guard verhindert Fehler, falls Exports fehlen
import * as Router from './router.js';

/* ------------------ UI: Hamburger / Overlay-Menu ------------------ */
function wireMenu(root = document) {
  const open = root.getElementById('navOpen');
  const menu = root.getElementById('navMenu');
  if (!open || !menu) return;

  // Doppelte Listener vermeiden
  if (open.dataset.wired === '1') return;
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

/* ------------------ Bottom-Nav aktiv markieren ------------------ */
function markActiveBottomNav() {
  const page = document.body?.getAttribute('data-page');
  if (!page) return;
  document.querySelectorAll('.site-bottom-nav .tab')
    .forEach(a => a.classList.toggle('active', a.dataset.nav === page));
}

/* ------------------ Gemeinsame Initialisierung ------------------ */
function initCommon() {
  // Modus anwenden & Toggle binden
  applyMode(getMode());
  bindModeToggle(document);

  // Router (falls vorhanden)
  if (typeof Router.bindLinks === 'function') Router.bindLinks();
  if (typeof Router.markActiveNav === 'function') Router.markActiveNav();
  if (typeof Router.bindEdgeKeys === 'function') Router.bindEdgeKeys();

  // Header-Menü & Bottom-Nav
  wireMenu(document);
  markActiveBottomNav();
}

/* ------------------ Page-Loader nach data-page ------------------ */
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
    if (typeof mod.init === 'function') mod.init();
  }
}

/* ------------------ Boot ------------------ */
async function boot() {
  await loadPartials();  // Header/Footer injizieren
  initCommon();          // Modus/Toggle, Router, Hamburger, Bottom-Nav
  await initPageScript();// Seitenspezifische Logik
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}

// Wenn Partials später (erneut) geladen werden, alles neu verdrahten
document.addEventListener('includes:done', initCommon);

// Optional: falls du kein SPA-Router-PushState nutzt und Back/Forward zuverlässig neu laden willst
// window.addEventListener('popstate', () => location.reload());
