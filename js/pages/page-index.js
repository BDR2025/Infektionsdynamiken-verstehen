// js/pages/page-index.js
(() => {
  const byMode = (m) =>
    m === 'uni' ? 'assets/Videos/Intro_Toggle_Mila.mp4'
                : 'assets/Videos/Intro_Toggle_Ben.mp4';

  function currentMode() {
    return document.documentElement.getAttribute('data-mode') || 'school';
  }

  function setCoachVideo() {
    const v = document.getElementById('coachVideo');
    if (!v) return;

    const want = byMode(currentMode());
    const srcEl = v.querySelector('source');
    if (!srcEl) return;

    if (!srcEl.src.endsWith(want)) {
      srcEl.src = want;
      v.load();
    }

    v.muted = true;
    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(() => {/* Autoplay block -> ignorieren */});
  }

  function init() {
    setCoachVideo();
    document.getElementById('toModels')?.addEventListener('click', () => {
      location.href = 'modelle.html';
    });
  }

  // reagieren auf Includes-Fertig + DOM
  document.addEventListener('includes:done', setCoachVideo);
  document.addEventListener('DOMContentLoaded', init, { once: true });

  // reagieren auf Modus-Wechsel (Custom Event oder Fallback per MutationObserver)
  document.addEventListener('mode:changed', setCoachVideo);
  new MutationObserver((muts) => {
    if (muts.some(m => m.type === 'attributes' && m.attributeName === 'data-mode')) setCoachVideo();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
})();

// Ergänzung in js/pages/page-index.js
function wireUnmute() {
  const v = document.getElementById('coachVideo');
  const b = document.getElementById('unmuteBtn');
  if (!v || !b) return;
  b.addEventListener('click', async () => {
    try {
      v.muted = false;
      // Kür: von vorne starten, damit nichts verpasst wird
      if (!isNaN(v.duration)) v.currentTime = 0;
      await v.play();
      b.style.display = 'none';
    } catch { /* Safari/iOS Edge Cases ignorieren */ }
  });
}
document.addEventListener('DOMContentLoaded', wireUnmute, { once:true });
document.addEventListener('mode:changed', ()=> {
  // nach Video-Quellenwechsel Overlay wieder zeigen
  const b = document.getElementById('unmuteBtn'); if (b) b.style.display='';
});
