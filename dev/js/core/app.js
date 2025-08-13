import { loadPartials } from './includes.js';
import { getMode, applyMode, bindModeToggle } from './mode.js';
import { bindLinks, markActiveNav, bindEdgeKeys } from './router.js';

async function initPageScript(){
  const page = document.body.dataset.page || '';
  const map = {
    'index': ()=> import('../pages/page-index.js'),
    'model-sir': ()=> import('../pages/page-model-sir.js'),
    'model-seir': ()=> import('../pages/page-model-seir.js'),
    'model-sis': ()=> import('../pages/page-model-sis.js'),
    'model-sirs': ()=> import('../pages/page-model-sirs.js'),
    'model-sirv': ()=> import('../pages/page-model-sirv.js'),
    'modelle': ()=> import('../pages/page-modelle.js'),
  };
  const key = Object.keys(map).find(k => page.startsWith(k));
  if (key){ (await map[key]()).init?.(); }
}

async function boot(){
  await loadPartials();
  applyMode(getMode());
  bindModeToggle();
  bindLinks();
  markActiveNav();
  bindEdgeKeys();
  await initPageScript();
}

document.addEventListener('DOMContentLoaded', boot);
window.addEventListener('popstate', ()=> location.reload());
