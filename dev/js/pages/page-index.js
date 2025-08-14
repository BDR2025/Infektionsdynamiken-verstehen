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
