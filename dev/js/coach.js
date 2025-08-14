export function initCoach(root=document){
  root.querySelectorAll('.coach').forEach(el=>{
    const transcript = el.dataset.transcript || '';
    const marquee = el.querySelector('.marquee span');
    if(marquee && transcript){ marquee.textContent = '  ' + transcript + '  •  ' + transcript + '  •  ' + transcript + '  '; }
  });
}