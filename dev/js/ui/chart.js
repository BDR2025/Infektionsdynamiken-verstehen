// Responsive Canvas + animiertes Zeichnen + DPR-Schärfe

export function fitCanvas(canvas, aspect = 0.57){
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const cssW = Math.max(320, canvas.clientWidth || 560);
  const cssH = Math.max(240, Math.round(cssW * aspect));
  canvas.width  = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // scharfe Linien auf Retina
}

export function drawSIRChart(canvas, series, N, { progress = 1 } = {}){
  if (!canvas || !series?.length) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.width / dpr, H = canvas.height / dpr;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,W,H);

  // Ränder
  const mL=40, mR=10, mT=10, mB=24;
  const plotW = W - mL - mR;
  const plotH = H - mT - mB;

  const tMax = series.at(-1).t;
  const yMax = N;

  // Teilmenge für Animation
  const lastIdx = Math.max(1, Math.floor((series.length-1) * progress));
  const seg = series.slice(0, lastIdx+1);

  const x = (t)=> mL + (t/tMax) * plotW;
  const y = (v)=> H - mB - (v/yMax) * plotH;

  ctx.lineWidth = 2;

  function plot(color, idx){
    ctx.beginPath();
    ctx.strokeStyle = color;
    seg.forEach((p,i)=>{
      const X = x(p.t), Y = y(p.y[idx]);
      if (i===0) ctx.moveTo(X,Y); else ctx.lineTo(X,Y);
    });
    ctx.stroke();
  }

  plot('#009E73', 0); // S (grün)
  plot('#D55E00', 1); // I (orange)
  plot('#0072B2', 2); // R (blau)
}

/** Spielt die Kurven in 'duration' ms ab.
 *  onTick({t,S,I,R,progress}) liefert Live-Werte (z.B. für KPIs).
 *  Rückgabewert: cancel()-Funktion, um die Animation zu stoppen.
 */
export function animateSIR(canvas, series, N, { duration=20000, onTick, onDone } = {}){
  fitCanvas(canvas);
  let raf = 0, start = 0;

  const step = (now)=>{
    if (!start) start = now;
    const p = Math.min(1, (now - start) / duration);
    drawSIRChart(canvas, series, N, { progress: p });

    if (onTick){
      const idx = Math.max(0, Math.floor((series.length-1) * p));
      const pt  = series[idx];
      onTick({ t: Math.round(pt.t), S: pt.y[0], I: pt.y[1], R: pt.y[2], progress: p });
    }
    if (p < 1) raf = requestAnimationFrame(step);
    else { onDone?.(); }
  };

  raf = requestAnimationFrame(step);
  return ()=> cancelAnimationFrame(raf);
}
