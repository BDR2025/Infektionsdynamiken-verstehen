// js/pages/page-model-sir.js
import { getMode } from '../core/mode.js';
import { runSIR, statsFromSeries } from '../models/sir.js';
import { fitCanvas, drawSIRChart, animateSIR } from '../ui/chart.js';

const N_SCHOOL = 100;

// fine-tuning for animation length (ms)
const INTRO_DURATION_MS = { school_case1: 12000, school_case2: 14000, uni_default: 16000 };

const presets = {
  school_case1: { N: N_SCHOOL, I0: 1, beta: (1/5)*0.8, gamma: 1/5, autoEnd: true, maxDays: 30 },
  school_case2: { N: N_SCHOOL, I0: 1, beta: (1/5)*2.0, gamma: 1/5, autoEnd: true },
  uni_default:  { N: 1000,     I0: 1, beta: 0.3,      gamma: 1/5, autoEnd: true }
};

let cancelAnim = null;
let lastSeries = null, lastN = null, lastProgress = 0;

export function init(){
  const mode = getMode();
  document.body.dataset.phase = 'intro'; // Coach first

  // Refs
  const chart = document.getElementById('sirCanvas');
  const summary = document.getElementById('schoolSummary');
  const uniKpis = document.getElementById('uniKpis');
  const btnTry = document.getElementById('btnTry');

  // Side panel refs
  const coachVideo = document.getElementById('coachVideo');
  const kpiGrid = document.getElementById('kpiGrid');
  const controls = document.getElementById('controls');
  const r0 = document.getElementById('rR0');
  const r0v = document.getElementById('rR0v');
  const days = document.getElementById('rDays');
  const daysv = document.getElementById('rDaysv');
  const kAn = document.getElementById('kAnsteck');
  const kS  = document.getElementById('kGesund');
  const kG  = document.getElementById('kGenesene');

  // ---------- Coach autoplay (no black, no click) ----------
  function ensureCoachAutoplay(){
    if (!coachVideo) return;
    coachVideo.muted = true;
    coachVideo.playsInline = true;
    coachVideo.autoplay = true;
    coachVideo.loop = true;
    coachVideo.removeAttribute('controls');
    coachVideo.style.background = '#fff';

    const tryPlay = ()=> { coachVideo.play().catch(()=>{}); };
    if (coachVideo.readyState >= 2) tryPlay();
    else coachVideo.addEventListener('canplay', tryPlay, { once:true });
    // absolute fallback: first tap anywhere starts playback
    document.addEventListener('pointerdown', tryPlay, { once:true, passive:true });
  }

  // ---------- Intro animation (Fall 1 → Fall 2) ----------
  function startIntro(presetKey){
    const p = presets[presetKey];
    const initVals = { S: p.N - p.I0, I: p.I0, R: 0 };
    const series = runSIR(p, initVals, p);
    lastSeries = series; lastN = p.N; lastProgress = 0;

    cancelAnim?.();
    ensureCoachAutoplay();           // video runs alongside the chart
    fitCanvas(chart);

    cancelAnim = animateSIR(chart, series, p.N, {
      duration: INTRO_DURATION_MS[presetKey] || 14000,
      emphasis: 'S', thin: 2, thick: 6, showAxes: false,
      labelLine: 'S',
      labelFormatter: ({t,S}) => `Tag ${t} · Gesund: ${Math.round(S)}`,
      onTick: ({progress}) => { lastProgress = progress; },
      onDone: () => {
        if (presetKey === 'school_case1' && mode === 'school') {
          setTimeout(()=> startIntro('school_case2'), 400);
        } else {
          const stats = statsFromSeries(series, p.N);
          if (mode === 'school'){
            summary.innerHTML = formatSchoolText(stats, presetKey);
            summary.hidden = false;
          } else {
            uniKpis.innerHTML = formatUniKpis(stats, p);
            uniKpis.hidden = false;
          }
        }
      }
    });
  }

  // Preset buttons
  document.querySelectorAll('[data-preset]').forEach(b=>{
    b.addEventListener('click', ()=>{
      summary.hidden = true;
      startIntro(b.dataset.preset);
    });
  });

  // Go interactive (hide Coach, show KPIs/Regler)
  btnTry?.addEventListener('click', ()=>{
    document.body.dataset.phase = 'interactive';
    kpiGrid.hidden = false;
    controls.hidden = false;
    summary.hidden = false; // keep the text below
    renderInteractive();
  });

  // Initial sequence
  startIntro(mode === 'school' ? 'school_case1' : 'uni_default');

  // ---------- Interactive view (same grid) ----------
  function renderInteractive(){
    const d = Math.max(2, Math.min(5, parseInt(days.value || '5', 10)));
    days.value = String(d); daysv.textContent = String(d);

    const R0 = parseFloat(r0.value || '2');
    r0v.textContent = R0.toFixed(1);

    const gamma = 1 / d;
    const beta  = R0 * gamma;
    const params = { N: N_SCHOOL, beta, gamma };
    const initVals = { S: N_SCHOOL - 1, I: 1, R: 0 };

    const series = runSIR(params, initVals, { autoEnd:true });

    fitCanvas(chart, 0.62);
    drawSIRChart(chart, series, params.N, {
      progress: 1, emphasis: 'S', thin: 2, thick: 6, showAxes: true
    });

    const end = series.at(-1).y;
    kAn.textContent = R0.toFixed(2);
    kS.textContent  = Math.round(end[0]);
    kG.textContent  = Math.round(end[2]);
  }
  r0?.addEventListener('input', renderInteractive);
  days?.addEventListener('input', renderInteractive);

  // Resize keeps sizes consistent
  window.addEventListener('resize', ()=>{
    if (document.body.dataset.phase === 'intro' && lastSeries){
      fitCanvas(chart);
      drawSIRChart(chart, lastSeries, lastN, {
        progress: Math.max(0.01, lastProgress),
        emphasis:'S', thin:2, thick:6, showAxes:false,
        labelLine:'S',
        labelFormatter: ({t,S}) => `Tag ${t} · Gesund: ${Math.round(S)}`
      });
    } else if (document.body.dataset.phase === 'interactive'){
      renderInteractive();
    }
  }, { passive:true });
}

// --- Text helpers ----------------------------------------------------------
function formatSchoolText(stats, presetKey){
  if (presetKey === 'school_case1'){
    return `
      <p>Zu Beginn ist <strong>eine Person</strong> in dieser Gruppe krank.</p>
      <p>Jede kranke Person steckt im Schnitt <strong>weniger als eine</strong> weitere Person an (Ansteckungszahl&nbsp;0,8).</p>
      <p>Der Ausbruch endet nach <strong>${stats.duration} Tagen</strong> mit insgesamt <strong>${stats.totalInfected} Erkrankten</strong>.
      <strong>${stats.totalNotInfected}</strong> Menschen haben sich nicht angesteckt.</p>`;
  }
  return `
    <p>Zu Beginn ist <strong>eine Person</strong> in dieser Gruppe krank.</p>
    <p>Jede kranke Person steckt im Schnitt <strong>zwei</strong> weitere an (Ansteckungszahl&nbsp;2,0).</p>
    <p>Der Höhepunkt des Ausbruchs wird am Tag <strong>${stats.tPeak}</strong> mit <strong>${stats.peakI} Erkrankten</strong> erreicht.</p>
    <p>Der Ausbruch endet nach <strong>${stats.duration} Tagen</strong> mit insgesamt <strong>${stats.totalInfected} Erkrankten</strong>
    und <strong>${stats.totalNotInfected}</strong> Menschen, die nicht erkrankt sind.</p>`;
}

function formatUniKpis(stats, params){
  return `
    <div>Kennzahlen (Uni)</div>
    <ul>
      <li>R₀ = ${(params.beta/params.gamma).toFixed(2)}</li>
      <li>Peak I: ${stats.peakI} am Tag ${stats.tPeak}</li>
      <li>Gesamt infiziert: ${stats.totalInfected}</li>
      <li>Nicht infiziert: ${stats.totalNotInfected}</li>
      <li>Dauer: ${stats.duration} Tage</li>
    </ul>`;
}
