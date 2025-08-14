export function getMode(){ return localStorage.getItem('mode') || 'school'; }
export function applyMode(mode){
  document.body.setAttribute('data-mode', mode);
  localStorage.setItem('mode', mode);
  const t = document.querySelector('.mode-toggle');
  if(t){ t.dataset.mode = mode;
    t.querySelectorAll('button[data-mode]').forEach(b=> b.setAttribute('aria-pressed', String(b.dataset.mode===mode)));
  }
}
export function bindModeToggle(root=document){
  const toggle = root.querySelector('.mode-toggle');
  if(!toggle || toggle.dataset.wired==='1') return;
  toggle.dataset.wired='1';
  toggle.addEventListener('click', e=>{
    const btn = e.target.closest('button[data-mode]'); if(!btn) return;
    applyMode(btn.dataset.mode);
  });
}