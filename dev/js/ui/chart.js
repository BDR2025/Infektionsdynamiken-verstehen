export function drawSIRChart(canvas, series, N){
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Margins
  const mL = 40, mR = 10, mT = 10, mB = 20;
  const plotW = W - mL - mR;
  const plotH = H - mT - mB;

  // Data extents
  const tMax = series[series.length - 1].t;
  const yMax = N;

  function xScale(t){ return mL + (t / tMax) * plotW; }
  function yScale(v){ return H - mB - (v / yMax) * plotH; }

  ctx.lineWidth = 2;

  // Plot helper
  function plotLine(color, idx){
    ctx.beginPath();
    ctx.strokeStyle = color;
    series.forEach((p, i) => {
      const x = xScale(p.t), y = yScale(p.y[idx]);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  plotLine('#009E73', 0); // S - grün
  plotLine('#D55E00', 1); // I - orange
  plotLine('#0072B2', 2); // R - blau
}
