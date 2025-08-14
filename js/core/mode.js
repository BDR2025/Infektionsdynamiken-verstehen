// js/core/mode.js
const KEY='infdyn.mode';
const VALID=new Set(['school','uni']);

export function getMode(){
  const attr=document.documentElement.getAttribute('data-mode');
  const saved=localStorage.getItem(KEY);
  return VALID.has(attr)?attr:(VALID.has(saved)?saved:'school');
}

export function applyMode(m){
  const mode=VALID.has(m)?m:'school';
  document.documentElement.setAttribute('data-mode',mode);
  localStorage.setItem(KEY,mode);
  document.getElementById('modeToggle')?.setAttribute('aria-checked', mode==='uni');
  document.dispatchEvent(new CustomEvent('mode:changed',{detail:{mode}}));
}

export function bindModeToggle(root=document){
  root.addEventListener('click',(e)=>{
    const t=e.target;
    if(!t) return;
    if(t.id==='modeToggle'){ applyMode(getMode()==='school'?'uni':'school'); return; }
    const btn=t.closest?.('[data-mode-target]');
    if(btn) applyMode(btn.getAttribute('data-mode-target'));
  });
}
