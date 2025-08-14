// ==============================
// Partials laden (Header/Footer)
// ==============================
export async function loadPartials(root = document) {
  const header = root.querySelector('[data-include="header"]');
  const footer = root.querySelector('[data-include="footer"]');

  // ➤ 1. bevorzugter Pfad relativ zur Seite
  // ➤ 2. Fallback: absolut ab Root
  const PATHS = {
    header: ['partials/header.html', '/partials/header.html'],
    footer: ['partials/footer.html', '/partials/footer.html']
  };

  async function fetchFirstOk(urls) {
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (res.ok) return await res.text();
      } catch (_) {/* weiter probieren */}
    }
    return null;
  }

  async function include(container, urls) {
    const html = await fetchFirstOk(urls);
    if (html) {
      container.innerHTML = html;
    } else {
      // Sichtbare Diagnose im DOM (statt „unsichtbar kaputt“)
      container.innerHTML =
        '<div style="padding:12px;border:1px solid #f00;color:#900;border-radius:8px;background:#ffecec">Partial konnte nicht geladen werden.</div>';
      console.error('Partial konnte nicht geladen werden:', urls);
    }
  }

  if (header) await include(header, PATHS.header);
  if (footer) await include(footer, PATHS.footer);
}
