// Load header / footer partials into [data-include] slots
export async function loadPartials(){
  const slots = document.querySelectorAll('[data-include]');
  for (const slot of slots){
    const name = slot.getAttribute('data-include');
    try{
      const res = await fetch(`./partials/${name}.html`, { cache: 'no-cache' });
      slot.innerHTML = await res.text();
    } catch(e){
      // Fallback (minimal)
      if (name === 'header') slot.innerHTML = '<header class="site-header"><div class="wrap header-row"><strong>Infektionsdynamiken</strong></div></header>';
      if (name === 'footer') slot.innerHTML = '<footer class="site-footer"><div class="wrap footer-row">© Infektionsdynamiken</div></footer>';
    }
  }
}
