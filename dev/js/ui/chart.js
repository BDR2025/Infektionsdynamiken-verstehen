// DPR-scharfes Canvas + animiertes Zeichnen + (optionale) Achsen & Label

export function fitCanvas(canvas, aspect = 0.57){
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const cssW = Math.max(320, canvas.clientWidth || 560);
  const cssH = Math.max(240, Math.round(cssW * aspect));
  canvas.width  = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.height = cssH + 'px';
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // 1 CSS-Pixel = 1 Einheit → scharfe Linien
}

function rr(ctx, x, y, w, h, r=8){
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y,   x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x,   y+h, r);
  ctx.arcTo(x,   y+h, x,   y,   r);
  ctx.arcTo(x,   y,   x+w, y,   r);
  ctx.closePath();
}

export function drawSIRChart(canvas, series, N, opts = {}){
  if (!canvas || !series?.length) return;
  const {
    progress = 1,
    emphasis = 'S',          // 'S' | 'I' | 'R' | null
    thin = 2,
    thick = 6,               // dicke Linie (School)
    showAxes = false,
    labelLine = null,        // 'S' | 'I' | 'R'
    labelFormatter = null    // (pt) => "Text"
  } = opts;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.width  / dpr;
  const H = canvas.height / dpr;
  ctx.clearRect(0,0,W,H);

  // Ränder
  const mL=44, mR=12, mT=12, mB=28;
  const plotW = W - mL - mR;
  const plotH = H - mT - mB;

  const tMax = series.at(-1).t;
  const yMax = N;

  const lastIdx = Math.max(1, Math.floor((series.length-1) * progress));
  const seg = series.slice(0, lastIdx+1);

  const x = (t)=> mL + (t/tMax) * plotW;
  const y = (v)=> H - mB - (v/yMax) * plotH;

  // Achsen (nur interaktiv)
  if (showAxes){
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    // Achsenrahmen
    ctx.strokeRect(mL, mT, plotW, plotH);

    // Y-Ticks (0,25,50,75,100% von N)
    ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.fillStyle = '#6b7280';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i=0;i<=4;i++){
      const val = Math.round((N * i)/4);
      const yy = y(val);
      ctx.beginPath(); ctx.moveTo(mL, yy); ctx.lineTo(W-mR, yy); ctx.strokeStyle = i===0? '#e5e7eb':'#f3f4f6'; ctx.stroke();
      ctx.fillText(String(val), mL-6, yy);
    }
    // X-Ticks (5 Teilungen)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i=0;i<=5;i++){
      const tt = Math.round((tMax * i) / 5);
      const xx = x(tt);
      ctx.beginPath(); ctx.moveTo(xx, H-mB); ctx.lineTo(xx, mT); ctx.strokeStyle = i===0? '#e5e7eb':'#f9fafb'; ctx.stroke();
      ctx.fillText(String(tt), xx, H-mB+6);
    }
  }

  // Linienfarben
  const colS = '#009E73'; // grün
  const colI = '#D55E00'; // orange
  const colR = '#0072B2'; // blau

  // Plot-Helfer
  function plot(color, idx, width){
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    seg.forEach((p,i)=>{
      const X = x(p.t), Y = y(p.y[idx]);
      if (i===0) ctx.moveTo(X,Y); else ctx.lineTo(X,Y);
    });
    ctx.stroke();
  }

  // Reihenfolge: erst dünne Linien, dann die betonte
  const mapIdx = { S:0, I:1, R:2 };
  const order = ['S','I','R'].filter(k => k !== emphasis).concat(emphasis ? [emphasis] : []);
  for (const k of order){
    const idx = mapIdx[k];
    const w = (k === emphasis && emphasis) ? thick : thin;
    const color = k==='S'? colS : k==='I'? colI : colR;
    plot(color, idx, w);
  }

  // Label an aktueller Position
  if (labelLine){
    const idx = mapIdx[labelLine];
    const pt = seg.at(-1);
    const LX = x(pt.t);
    const LY = y(pt.y[idx]);

    const text = labelFormatter ? labelFormatter({t:Math.round(pt.t), S:pt.y[0], I:pt.y[1], R:pt.y[2]}) : '';
    if (text){
      const padX=10, padY=6;
      ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Arial';
      const tw = ctx.measureText(text).width;
      const boxW = tw + padX*2;
      const boxH = 22;
      let bx = Math.min(Math.max(LX + 10, mL), W - mR - boxW);
      let by = Math.min(Math.max(LY - boxH/2, mT), H - mB - boxH);

      ctx.fillStyle = 'rgba(255,255,255,.92)';
      ctx.strokeStyle = '#cbd5e1';
      rr(ctx, bx, by, boxW, boxH, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#111827';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, bx + padX, by + boxH/2);
    }
  }
}

/** Animiert über 'duration' ms.
 *  Optionen:
 *   - emphasis, thin, thick, showAxes
 *   - labelLine, labelFormatter
 *   - onTick({t,S,I,R,progress}), onDone()
 */
export function animateSIR(canvas, series, N, opts = {}){
  const {
    duration = 20000,
    onTick, onDone,
    emphasis = 'S',
    thin = 2,
    thick = 6,
    showAxes = false,
    labelLine = null,
    labelFormatter = null
  } = opts;

  fitCanvas(canvas);
  let raf = 0, start = 0;

  const step = (now)=>{
    if (!start) start = now;
    const p = Math.min(1, (now - start) / duration);

    drawSIRChart(canvas, series, N, {
      progress: p, emphasis, thin, thick, showAxes,
      labelLine, labelFormatter
    });

    const idx = Math.max(0, Math.floor((series.length-1) * p));
    const pt  = series[idx];
    onTick?.({ t: Math.round(pt.t), S: pt.y[0], I: pt.y[1], R: pt.y[2], progress: p });

    if (p < 1) raf = requestAnimationFrame(step);
    else onDone?.();
  };

  raf = requestAnimationFrame(step);
  return ()=> cancelAnimationFrame(raf);
}
