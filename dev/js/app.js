// js/app.js
import { loadPartials } from './includes.js';
import { getMode, applyMode, bindModeToggle } from './mode.js';
import { wireMenu } from './header.js';
import { initCoach } from './coach.js';

(async function init() {
  try {
    // 1) Header/Footer laden (muss zuerst passieren)
    await loadPartials();

    // 2) Modus anwenden & Schalter binden
    applyMode(getMode());
    bindModeToggle(document);   // erwartet .mode-toggle [data-mode]

    // 3) Navigation/Hamburger binden (erwartet #navOpen / #navMenu)
    wireMenu(document);

    // 4) Coach-Komponente initialisieren (sucht .coach)
    initCoach(document);

    // 5) Tabbar-Highlight setzen
    const page = document.body.getAttribute('data-page') || '';
    document.querySelectorAll('.tabbar a[data-nav]')
      .forEach(a => a.classList.toggle('active', a.dataset.nav === page));

  } catch (err) {
    console.error('[app] Initialisierung fehlgeschlagen:', err);
    // Fallback: Seite bleibt nutzbar, aber wir loggen klar den Fehler.
  }
})();
