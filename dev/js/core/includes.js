// js/core/includes.js
(() => {
  const ATTR = 'data-include';
  const DIRS = [
    '/partials/',                // absolute vom Root
    './partials/',               // relativ zum Dokument
    '../partials/'               // eine Ebene höher
  ];

  async function fetchFirst(file) {
    for (const d of DIRS) {
      try {
        const res = await fetch(d + file, { cache: 'no-cache' });
        if (res.ok) return res.text();
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
      } catch (err) {
        console.error('[includes]', err);
      }
    }));
    document.dispatchEvent(new CustomEvent('includes:done'));
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', run, { once:true });
  else run();
})();
