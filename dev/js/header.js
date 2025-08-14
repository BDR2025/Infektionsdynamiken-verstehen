export function wireMenu(root=document){
  const open=root.getElementById('navOpen');
  const menu=root.getElementById('navMenu');
  if(!open||!menu) return;
  const setOpen = on=>{ menu.setAttribute('aria-hidden', String(!on)); document.body.classList.toggle('no-scroll', on); };
  open.addEventListener('click',()=> setOpen(menu.getAttribute('aria-hidden')!=='false'));
  menu.addEventListener('click',(e)=>{ if(e.target===menu) setOpen(false); });
  document.addEventListener('keydown',(e)=>{ if(e.key==='Escape') setOpen(false); },{passive:true});
}