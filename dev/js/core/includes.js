// js/core/includes.js
export async function loadPartials() {
  const ATTR = 'data-include';
  const DIRS = ['/partials/','partials/','../partials/','../../partials/'];

  async function fetchFirst(file){
    for (const d of DIRS){
      try{ const r = await fetch(d+file,{cache:'no-cache'}); if(r.ok){ console.info('[includes] using',d+file); return r.text(); } }
      catch{}
    }
    throw new Error(`Include nicht gefunden: ${file}`);
  }

  const nodes = [...document.querySelectorAll(`[${ATTR}]`)];
  await Promise.all(nodes.map(async el=>{
    const key = (el.getAttribute(ATTR)||'').trim();
    if(!key) return;
    const file = key.endsWith('.html')? key : `${key}.html`;
    try{
      const html = await fetchFirst(file);
      el.insertAdjacentHTML('beforebegin', html);
      el.remove();
    }catch(e){ console.error('[includes]', e); }
  }));

  document.dispatchEvent(new CustomEvent('includes:done'));
}
