const KEY = 'infdyn-mode';

export function getMode(){
  const m = localStorage.getItem(KEY);
  return (m === 'uni' || m === 'school') ? m : 'school';
}
export function applyMode(mode){
  document.documentElement.setAttribute('data-mode', mode);
  const btn = document.getElementById('modeToggle');
  if (btn) btn.setAttribute('aria-pressed', String(mode === 'uni'));
}
export function setMode(mode){
  localStorage.setItem(KEY, mode);
  applyMode(mode);
}
export function toggleMode(){
  setMode(getMode() === 'school' ? 'uni' : 'school');
}
export function bindModeToggle(){
  const btn = document.getElementById('modeToggle');
  if (btn && !btn.dataset.bound){
    btn.dataset.bound = '1';
    btn.addEventListener('click', (e)=>{ e.preventDefault(); toggleMode(); });
  }
}
