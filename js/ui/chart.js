// js/ui/chart.js
// DPR-scharfes Canvas, Achsen, Linien & Animationen für SIR & SEIR

// Farben (School)
const COL_S = '#009E73'; // grün
const COL_E = '#f59e0b'; // orange (Exposed) - bewusst kräftig
const COL_I = '#D55E00'; // orange-rot (Infected)
const COL_R = '#0072B2'; // blau

// ---------- Canvas Utilities ----------
export function fitCanvas(canvas, aspect = 0.62) {
  if (!canvas) return { ctx: null, w: 0, h: 0 };
  const dpr = window.devicePixelRatio || 1;

  // NEU: Breite vom Parent statt vom Canvas selbst messen
  const host = canvas.parentElement || canvas;
  const hostW = Math.round(host.getBoundingClientRect().width || host.clientWidth || 560);

  const cssW = Math.max(320, hostW);
  const cssH = Math.max(220, Math.round(cssW * aspect));

  canvas.width  = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);

  // Wichtig: CSS-Breite auf 100%, damit der Parent die Größe vorgibt
  canvas.style.width  = '100%';
  canvas.style.height = cssH + 'px';

  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: cssW, h: cssH };
}


function rr(ctx, x, y, w, h, r = 8) {        // Rounded-Rect Pfad
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

function drawAxes(ctx, W, H, m, N, tMax) {
  // m = {L,R,T,B}
  ctx.save();
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  // Rahmen
  ctx.strokeRect(m.L, m.T, W - m.L - m.R, H - m.T - m.B);

  // Y-Ticks (0..N in 5 Schritten)
  const stepsY = 5;
  ctx.font = '12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial';
  ctx.fillStyle = '#6b7280';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= stepsY; i++) {
    const val = Math.round((N * i) / stepsY);
    const yy = mapY(val, H, m, N);
    ctx.beginPath();
    ctx.moveTo(m.L, yy);
    ctx.lineTo(W - m.R, yy);
    ctx.strokeStyle = i === 0 ? '#e5e7eb' : '#f3f4f6';
    ctx.stroke();
    ctx.fillText(String(val), m.L - 6, yy);
  }

  // X-Ticks (0..tMax in 6 Schritten)
  const stepsX = 6;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= stepsX; i++) {
    const tt = Math.round((tMax * i) / stepsX);
    const xx = mapX(tt, W, m, tMax);
    ctx.beginPath();
    ctx.moveTo(xx, H - m.B);
    ctx.lineTo(xx, m.T);
    ctx.strokeStyle = i === 0 ? '#e5e7eb' : '#f9fafb';
    ctx.stroke();
    ctx.fillText(String(tt), xx, H - m.B + 6);
  }
  ctx.restore();
}

function mapX(t, W, m, tMax) {
  const plotW = W - m.L - m.R;
  return m.L + (t / tMax) * plotW;
}
function mapY(v, H, m, N) {
  const plotH = H - m.T - m.B;
  return H - m.B - (v / N) * plotH;
}

function pickSegment(series, progress) {
  const p = Math.max(0, Math.min(1, progress ?? 1));
  if (!series?.length) return series;
  const lastIdx = Math.max(0, Math.floor((series.length - 1) * p));
  return series.slice(0, lastIdx + 1);
}

function pathLine(ctx, seg, pickY, color, width, W, H, m, N, tMax) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i < seg.length; i++) {
    const p = seg[i];
    const X = mapX(p.t, W, m, tMax);
    const Y = mapY(pickY(p.y), H, m, N);
    if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawLabel(ctx, text, X, Y, color) {
  if (!text) return;
  const padX = 10, padY = 6, boxH = 22;
  ctx.save();
  ctx.font = '12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial';
  const tw = ctx.measureText(text).width;
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  ctx.strokeStyle = '#cbd5e1';
  rr(ctx, X, Y - boxH / 2, tw + 2 * padX, boxH, 10);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, X + padX, Y);
  ctx.restore();
}

// ---------- SIR ----------
export function drawSIRChart(canvas, series, N, opts = {}) {
  if (!canvas || !series?.length) return;
  const {
    progress = 1,
    emphasis = 'S',        // 'S' | 'I' | 'R' | null
    thin = 2,
    thick = 6,
    showAxes = false,
    labelLine = null,      // 'S' | 'I' | 'R'
    labelFormatter = null, // fn({t,S,I,R}) => string
    aspect = 0.62
  } = opts;

  const { ctx, w: W, h: H } = fitCanvas(canvas, aspect);
  ctx.clearRect(0, 0, W, H);

  const m = { L: 44, R: 12, T: 12, B: 28 };
  const tMax = series.at(-1).t;
  const seg = pickSegment(series, progress);

  if (showAxes) drawAxes(ctx, W, H, m, N, tMax);

  // Reihenfolge: erst dünne, dann betonte
  const idxMap = { S: 0, I: 1, R: 2 };
  const order = ['S', 'I', 'R'].filter(k => k !== emphasis).concat(emphasis ? [emphasis] : []);
  for (const k of order) {
    const idx = idxMap[k];
    const width = (k === emphasis && emphasis) ? thick : thin;
    const col = k === 'S' ? COL_S : k === 'I' ? COL_I : COL_R;
    pathLine(ctx, seg, y => y[idx], col, width, W, H, m, N, tMax);
  }

  // Label am Ende
  if (labelLine) {
    const idx = idxMap[labelLine];
    const p = seg.at(-1) || series[0];
    const X = Math.min(W - m.R - 120, mapX(p.t, W, m, tMax) + 8);
    const Y = Math.max(m.T + 12, Math.min(H - m.B - 12, mapY(p.y[idx], H, m, N)));
    const color = labelLine === 'S' ? COL_S : labelLine === 'I' ? COL_I : COL_R;
    const text = labelFormatter ? labelFormatter({ t: Math.round(p.t), S: p.y[0], I: p.y[1], R: p.y[2] }) : '';
    drawLabel(ctx, text, X, Y, color);
  }
}

export function animateSIR(canvas, series, N, opts = {}) {
  const {
    duration = 20000,
    onTick, onDone,
    emphasis = 'S', thin = 2, thick = 6,
    showAxes = false, labelLine = null, labelFormatter = null, aspect = 0.62
  } = opts;

  fitCanvas(canvas, aspect);
  let raf = 0, start = 0;

  const step = now => {
    if (!start) start = now;
    const p = Math.min(1, (now - start) / Math.max(400, duration));
    drawSIRChart(canvas, series, N, { progress: p, emphasis, thin, thick, showAxes, labelLine, labelFormatter, aspect });
    const idx = Math.max(0, Math.floor((series.length - 1) * p));
    const pt = series[idx];
    onTick?.({ t: Math.round(pt.t), S: pt.y[0], I: pt.y[1], R: pt.y[2], progress: p });
    if (p < 1) raf = requestAnimationFrame(step); else onDone?.();
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

// ---------- SEIR ----------
export function drawSEIRChart(canvas, series, N, opts = {}) {
  if (!canvas || !series?.length) return;
  const {
    progress = 1,
    thin = 2,
    thick = 6,
    thickE = 8,           // E betonen
    showAxes = false,
    labelLine = null,      // 'S'|'E'|'I'|'R'
    labelFormatter = null, // fn({t,S,E,I,R})
    aspect = 0.62
  } = opts;

  const { ctx, w: W, h: H } = fitCanvas(canvas, aspect);
  ctx.clearRect(0, 0, W, H);

  const m = { L: 44, R: 12, T: 12, B: 28 };
  const tMax = series.at(-1).t;
  const seg = pickSegment(series, progress);

  if (showAxes) drawAxes(ctx, W, H, m, N, tMax);

  // Reihenfolge: R (blau), I (rot), S (grün), E (orange fett oben)
  pathLine(ctx, seg, y => y[3], COL_R, thin,   W, H, m, N, tMax); // R
  pathLine(ctx, seg, y => y[2], COL_I, thin,   W, H, m, N, tMax); // I
  pathLine(ctx, seg, y => y[0], COL_S, thick,  W, H, m, N, tMax); // S
  pathLine(ctx, seg, y => y[1], COL_E, thickE, W, H, m, N, tMax); // E (fett)

  // Label am Ende
  if (labelLine) {
    const idxMap = { S: 0, E: 1, I: 2, R: 3 };
    const p = seg.at(-1) || series[0];
    const idx = idxMap[labelLine] ?? 1;
    const X = Math.min(W - m.R - 140, mapX(p.t, W, m, tMax) + 8);
    const Y = Math.max(m.T + 12, Math.min(H - m.B - 12, mapY(p.y[idx], H, m, N)));
    const color = labelLine === 'S' ? COL_S : labelLine === 'E' ? COL_E : labelLine === 'I' ? COL_I : COL_R;
    const text = labelFormatter ? labelFormatter({ t: Math.round(p.t), S: p.y[0], E: p.y[1], I: p.y[2], R: p.y[3] }) : '';
    drawLabel(ctx, text, X, Y, color);
  }
}

export function animateSEIR(canvas, series, N, opts = {}) {
  const {
    duration = 14000,
    onTick, onDone,
    thin = 2, thick = 6, thickE = 8,
    showAxes = false, labelLine = 'E', labelFormatter = null, aspect = 0.62
  } = opts;

  fitCanvas(canvas, aspect);
  let raf = 0, start = 0;

  const step = now => {
    if (!start) start = now;
    const p = Math.min(1, (now - start) / Math.max(400, duration));
    drawSEIRChart(canvas, series, N, { progress: p, thin, thick, thickE, showAxes, labelLine, labelFormatter, aspect });
    const idx = Math.max(0, Math.floor((series.length - 1) * p));
    const pt = series[idx];
    onTick?.({ t: Math.round(pt.t), S: pt.y[0], E: pt.y[1], I: pt.y[2], R: pt.y[3], progress: p });
    if (p < 1) raf = requestAnimationFrame(step); else onDone?.();
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}
