import { loadPartials } from './partials.js';
import { getMode, applyMode, bindModeToggle } from './mode.js';
import { wireMenu } from './header.js';
import { initCoach } from './coach.js';

(async function(){
  await loadPartials();          // ⬅️ erst Partials
  applyMode(getMode());
  bindModeToggle(document);
  wireMenu(document);
  initCoach(document);

  const page = document.body.getAttribute('data-page') || '';
  document.querySelectorAll('.tabbar a[data-nav]')
    .forEach(a => a.classList.toggle('active', a.dataset.nav === page));
})();
