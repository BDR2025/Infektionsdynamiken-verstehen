// ➤ Initialisiert alle Coach-Elemente (Video, Unmute-Button, Marquee)
export function initCoach(root = document) {
  root.querySelectorAll('.coach').forEach(el => {

    // ➤ Marquee-Text aus data-transcript setzen
    const transcript = el.dataset.transcript || '';
    const marquee = el.querySelector('.marquee span');
    if (marquee && transcript) {
      marquee.textContent =
        `  ${transcript}  •  ${transcript}  •  ${transcript}  `;
    }

    // ➤ Video-Element referenzieren
    const video = el.querySelector('video');

    // ➤ Falls Video existiert → stumm starten
    if (video) {
      video.muted = true;
      video.play().catch(() => {
        // ➤ Falls Autoplay blockiert wurde → ignorieren
      });
    }

    // ➤ Unmute-Button referenzieren
    const unmuteBtn = el.querySelector('.unmute');
    if (unmuteBtn && video) {
      unmuteBtn.addEventListener('click', () => {
        if (video.muted) {
          video.muted = false;
          video.play().catch(() => {});
          unmuteBtn.style.display = 'none'; // ➤ Button ausblenden nach Aktivierung
        }
      });
    }
  });
}
