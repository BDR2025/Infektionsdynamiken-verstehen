
(function(){
  const qs  = (s, c=document) => c.querySelector(s);
  const qsa = (s, c=document) => Array.from(c.querySelectorAll(s));

  // Carousel
  qsa('.peek-carousel').forEach((car) => {
    const track = qs('.peek-track', car);
    const slides = qsa('.peek-slide', track);
    const prev = qs('.peek-prev', car);
    const next = qs('.peek-next', car);
    const dotsWrap = qs('.peek-dots', car);
    let idx = 0;
    function go(i){
      idx = (i + slides.length) % slides.length;
      track.style.transform = `translateX(-${idx*100}%)`;
      if(dotsWrap){ qsa('.peek-dot', dotsWrap).forEach((d, k)=>d.classList.toggle('active', k===idx)); }
    }
    if(dotsWrap && !dotsWrap.children.length){
      slides.forEach((_,k)=>{
        const b = document.createElement('button'); b.className = 'peek-dot' + (k===0?' active':''); b.type='button';
        b.addEventListener('click', ()=>go(k)); dotsWrap.appendChild(b);
      });
    }
    prev && prev.addEventListener('click', ()=>go(idx-1));
    next && next.addEventListener('click', ()=>go(idx+1));
    car.tabIndex = 0;
    car.addEventListener('keydown', (e)=>{
      if(e.key==='ArrowRight') go(idx+1);
      if(e.key==='ArrowLeft')  go(idx-1);
    });
    let sx=0, dx=0;
    car.addEventListener('touchstart', (e)=>{ sx = e.changedTouches[0].clientX; dx=0; }, {passive:true});
    car.addEventListener('touchmove', (e)=>{ dx = e.changedTouches[0].clientX - sx; }, {passive:true});
    car.addEventListener('touchend', ()=>{ if(Math.abs(dx)>40){ go(idx + (dx<0?1:-1)); } sx=0; dx=0; }, {passive:true});
  });

  // Nav active underline follow
  const navLinks = qsa('.nav-links a[href^="#"]');
  if(navLinks.length){
    const setActive = (hash)=>{
      const id = (hash||'').replace('#','') || 'intro';
      navLinks.forEach(a=>a.classList.toggle('active', a.getAttribute('href') === '#' + id));
    };
    navLinks.forEach(a=>a.addEventListener('click', ()=>setActive(a.getAttribute('href'))));
    const sections = qsa('section[id]');
    const map = new Map(navLinks.map(a=>[a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          const id = entry.target.id;
          navLinks.forEach(a=>a.classList.remove('active'));
          const link = map.get(id); if(link) link.classList.add('active');
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0.01 });
    sections.forEach(s=>io.observe(s));
    setActive(location.hash);
  }
})();
