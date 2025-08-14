// js/core/includes.js
(() => {
  const ATTR = 'data-include';
  const DIRS = (() => {
    const here = location.pathname.replace(/\/[^/]*$/, '/');
    return Array.from(new Set([`${here}partials/`, `${here}../partials/`, `/partials/`]));
  })();

  async function fetchFirst(file) {
    for (const d of DIRS) {
      try {
        const r = await fetch(d + file, { cache: 'no-cache' });
        if (r.ok) return r.text();
      } catch {}
    }
    throw new Error(`Include nicht gefunden: ${file}`);
  }

  async function run() {
    const els = [...document.querySelectorAll(`[${ATTR}]`)];
    await Promise.all(els.map(async el => {
      const key = (el.getAttribute(ATTR) || '').trim();
      if (!key) return;
      const file = key.endsWith('.html') ? key : `${key}.html`;
      try {
        const html = await fetchFirst(file);
        el.insertAdjacentHTML('beforebegin', html);
        el.remove();
        console.info(`[includes] injected ${file}`);
      } catch (e) { console.error('[includes]', e); }
    }));
    document.dispatchEvent(new CustomEvent('includes:done'));
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', run, { once:true });
  else run();
})();
