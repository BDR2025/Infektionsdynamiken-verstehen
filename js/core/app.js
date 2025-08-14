// Jahr in Footer
document.addEventListener('DOMContentLoaded', () => {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});

// Hamburger / Drawer
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('.hamburger');
  const drawer = document.getElementById('nav-drawer');
  const scrim = drawer?.querySelector('.nav-drawer__scrim');
  const closeBtn = drawer?.querySelector('.nav-drawer__close');

  function openDrawer(){
    drawer.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    drawer.setAttribute('aria-hidden', 'false');
  }
  function closeDrawer(){
    drawer.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    drawer.setAttribute('aria-hidden', 'true');
  }

  btn?.addEventListener('click', () => {
    const expanded = btn.getAttribute('aria-expanded') === 'true';
    expanded ? closeDrawer() : openDrawer();
  });
  scrim?.addEventListener('click', closeDrawer);
  closeBtn?.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDrawer();
  });
});

// School / University Toggle (Click + Swipe + Tastatur + Persistenz)
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('modeToggle');
  if (!toggle) return;

  const root = document.documentElement;
  let state = (localStorage.getItem('mode') || 'school') === 'university' ? 'university' : 'school';

  function applyState(next){
    state = next;
    const isUni = state === 'university';
    toggle.setAttribute('aria-checked', isUni ? 'true' : 'false');
    toggle.classList.toggle('is-university', isUni);
    root.classList.toggle('mode-university', isUni);
    root.classList.toggle('mode-school', !isUni);
    localStorage.setItem('mode', state);
  }

  // Initial
  applyState(state);

  // Klick überall auf dem Toggle
  toggle.addEventListener('click', (e) => {
    // Verhindere Doppelauslösung bei Drag-Ende
    if (toggle.classList.contains('is-dragging')) return;
    applyState(state === 'university' ? 'school' : 'university');
  });

  // Tastatur (Space/Enter)
  toggle.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter'){
      e.preventDefault();
      applyState(state === 'university' ? 'school' : 'university');
    }
  });

  // Swipe / Drag via Pointer Events
  let dragging = false;
  let rect = null;

  function setProgress(p){
    const clamped = Math.max(0, Math.min(1, p));
    toggle.style.setProperty('--progress', String(clamped));
  }

  toggle.addEventListener('pointerdown', (e) => {
    dragging = true;
    rect = toggle.getBoundingClientRect();
    toggle.setPointerCapture(e.pointerId);
    toggle.classList.add('is-dragging');
    // Startprogress abhängig vom State
    setProgress(state === 'university' ? 1 : 0);
  });

  toggle.addEventListener('pointermove', (e) => {
    if (!dragging || !rect) return;
    const p = (e.clientX - rect.left) / rect.width;
    setProgress(p);
  });

  function endDrag(e){
    if (!dragging) return;
    dragging = false;
    toggle.classList.remove('is-dragging');
    // Entscheide final nach > 0.5
    const styles = getComputedStyle(toggle);
    const p = parseFloat(styles.getPropertyValue('--progress')) || 0;
    applyState(p > 0.5 ? 'university' : 'school');
    // Rücksetzen, CSS steuert wieder
    toggle.style.removeProperty('--progress');
  }

  toggle.addEventListener('pointerup', endDrag);
  toggle.addEventListener('pointercancel', endDrag);
});
