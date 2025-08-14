// ➤ Bindet die Logik für das Öffnen und Schließen des Navigationsmenüs
export function wireMenu(root = document) {
  // ➤ Sucht das Menü-Öffnen-Element (Hamburger) und das Menü selbst
  const open = root.getElementById('navOpen');
  const menu = root.getElementById('navMenu');

  // ➤ Falls Elemente fehlen → Abbruch
  if (!open || !menu) return;

  // ➤ Funktion zum Setzen des Öffnungsstatus
  const setOpen = (on) => {
    menu.setAttribute('aria-hidden', String(!on)); // Accessibility: aria-hidden setzen
    document.body.classList.toggle('no-scroll', on); // Body-Scroll sperren/freigeben
  };

  // ➤ Klick auf Hamburger-Icon → Menü öffnen/schließen
  open.addEventListener('click', () => {
    setOpen(menu.getAttribute('aria-hidden') !== 'false');
  });

  // ➤ Klick auf den Menü-Overlay-Hintergrund → Menü schließen
  menu.addEventListener('click', (e) => {
    if (e.target === menu) setOpen(false);
  });

  // ➤ Escape-Taste → Menü schließen
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  }, { passive: true });
}
