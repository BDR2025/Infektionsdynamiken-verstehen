// js/core/includes.js
(() => {
  const ATTR = 'data-include';
  const DIR_CANDIDATES = (() => {
    const here = location.pathname.replace(/\/[^/]*$/, '/');      // aktuelles Verzeichnis
    const uniq = new Set([
      `${here}partials/`,
      `${here}../partials/`,
      `/partials/`,
    ]);
    return Array.from(uniq);
  })();

  async function fetchFirst(file) {
    for (const dir of DIR_CANDIDATES) {
      const url = dir + file;
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (res.ok) return res.text();
      } catch (_) { /* ignore */ }
    }
    throw new Error(`Include nicht gefunden: ${file} in ${DIR_CANDIDATES.join(', ')}`);
  }

  async function run() {
    const nodes = [...document.querySelectorAll(`[${ATTR}]`)];
    await Promise.all(nodes.map(async (el) => {
      const key = (el.getAttribute(ATTR) || '').trim(); // z.B. "header" oder "footer"
      if (!key) return;
      const file = key.endsWith('.html') ? key : `${key}.html`;
      try {
        const html = await fetchFirst(file);
        // Komplett ersetzen (keine verschachtelten Wrapper)
        el.insertAdjacentHTML('beforebegin', html);
        el.remove();
        console.info(`[includes] injected ${file}`);
      } catch (err) {
        console.error('[includes]', err);
      }
    }));

    // Signal für nachgeladene Komponenten (z.B. Mode-Toggle)
    document.dispatchEvent(new CustomEvent('includes:done'));

    // Falls mode.js eine init-Funktion hat, nachladen
    if (window.mode && typeof window.mode.init === 'function') {
      try { window.mode.init(); } catch (e) { console.warn('mode.init() failed:', e); }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();
