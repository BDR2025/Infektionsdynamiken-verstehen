// js/includes.js
// Lädt Partials immer aus /dev/partials/ – funktioniert lokal und online.

function detectBase() {
  // Hier fest auf /dev/ gesetzt
  return '/dev/';
}

async function fetchFirstOk(urls) {
  for (const u of urls) {
    try {
      const res = await fetch(u, { credentials: 'same-origin' });
      if (res.ok) return res.text();
    } catch (_) {
      // still ignorieren und nächsten Kandidaten probieren
    }
  }
  throw new Error(
    "Keiner der Partial-Pfade lieferte 200 OK:\n" + urls.join("\n")
  );
}

export async function loadPartials() {
  const base = detectBase();

  const makeCandidates = (name) => [
    // 1) Base-relativ (/dev/)
    `${base}partials/${name}.html`,
    // 2) Root-relativ als Fallback
    `/partials/${name}.html`,
    // 3) Dokument-relativ (lokal)
    `partials/${name}.html`
  ];

  const nodes = document.querySelectorAll('[data-include]');
  await Promise.all(
    [...nodes].map(async (el) => {
      const name = el.getAttribute('data-include');
      try {
        const html = await fetchFirstOk(makeCandidates(name));
        el.innerHTML = html;
      } catch (err) {
        console.error(`[includes] Partial "${name}" nicht geladen:`, err);
        el.innerHTML = `<div class="partial-error">Partial "${name}" nicht gefunden.</div>`;
      }
    })
  );
}
