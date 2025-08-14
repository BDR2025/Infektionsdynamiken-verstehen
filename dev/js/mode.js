// ➤ Liest den aktuellen Modus aus dem localStorage oder setzt Standard auf "school"
export function getMode() {
  return localStorage.getItem('mode') || 'school';
}

// ➤ Wendet den Modus auf das <body>-Element an und speichert ihn im localStorage
export function applyMode(mode) {
  document.body.setAttribute('data-mode', mode);
  localStorage.setItem('mode', mode);

  // ➤ Aktualisiert den Toggle-Button, falls vorhanden
  const toggle = document.querySelector('.mode-toggle');
  if (toggle) {
    toggle.dataset.mode = mode;

    // ➤ Setzt aria-pressed entsprechend dem aktiven Modus
    toggle.querySelectorAll('button[data-mode]').forEach(button => {
      button.setAttribute(
        'aria-pressed',
        String(button.dataset.mode === mode)
      );
    });
  }
}

// ➤ Bindet den Event-Listener für den Modus-Toggle
export function bindModeToggle(root = document) {
  const toggle = root.querySelector('.mode-toggle');

  // ➤ Abbrechen, falls kein Toggle vorhanden oder bereits verbunden
  if (!toggle || toggle.dataset.wired === '1') return;
  toggle.dataset.wired = '1';

  // ➤ Klick-Handler fü
