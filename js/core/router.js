function isInternal(a){
  try { return new URL(a.href, location.href).origin === location.origin; }
  catch(e){ return false; }
}

async function fetchMain(url){
  const res = await fetch(url, { headers:{'X-Requested-With':'view-transition'} });
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return {
    main: doc.querySelector('#content'),
    title: doc.title,
    page: doc.body?.dataset?.page || ''
  };
}

export async function transitionTo(url, push=true){
  const current = document.querySelector('#content');
  if (!current){ location.href = url; return; }
  if (!document.startViewTransition){
    location.href = url; return;
  }
  const { main, title, page } = await fetchMain(url);
  await document.startViewTransition(()=>{
    current.replaceWith(main);
    main.id = 'content';
  }).finished;
  if (push) history.pushState({}, title, url);
  document.title = title;
  document.body.setAttribute('data-page', page || '');
  bindLinks();
  markActiveNav();
  bindEdgeKeys();
}

export function bindLinks(){
  document.querySelectorAll('a[data-transition]').forEach(a => {
    if (a.dataset.bound) return;
    a.dataset.bound = '1';
    a.addEventListener('click', e => {
      if (!isInternal(a)) return;
      e.preventDefault();
      transitionTo(a.getAttribute('href'), true);
    });
  });
}

export function markActiveNav(){
  const page = document.body.dataset.page || '';
  const map = {
    'index': 'index',
    'modelle': 'modelle',
    'model-': 'modelle',
    'repo': 'repo',
    'kontakt': 'kontakt',
    'recht': 'recht'
  };
  const key = Object.keys(map).find(k => page.startsWith(k));
  document.querySelectorAll('nav a[data-nav]').forEach(a => {
    a.removeAttribute('aria-current');
    if (key && a.dataset.nav === map[key]) a.setAttribute('aria-current','page');
  });
}

/* Edge arrows: keyboard (←/→) */
export function bindEdgeKeys(){
  const prev = document.querySelector('.edge-prev');
  const next = document.querySelector('.edge-next');
  if (!prev && !next) return;
  const onKey = (e)=>{
    if (e.key === 'ArrowLeft' && prev){ e.preventDefault(); prev.click(); }
    if (e.key === 'ArrowRight' && next){ e.preventDefault(); next.click(); }
  };
  // Avoid multiple
  window.removeEventListener('keydown', window.__edgeNavHandler || (()=>{}));
  window.__edgeNavHandler = onKey;
  window.addEventListener('keydown', onKey);
}
