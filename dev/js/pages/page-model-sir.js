import { getMode } from '../core/mode.js';
import { runSIR, statsFromSeries } from '../models/sir.js';
import { fitCanvas, drawSIRChart, animateSIR } from '../ui/chart.js';

const N_SCHOOL = 100;
const presets = {
  school_case1: { N: N_SCHOOL, I0: 1, beta: (1/5)*0.8, gamma: 1/5, autoEnd: true, maxDays: 30 },
  school_case2: { N: N_SCHOOL, I0: 1, beta: (1/5)*2.0, gamma: 1/5, autoEnd: true },
  uni_default:  { N: 1000,     I0: 1, beta: 0.3,      gamma: 1/5, autoEnd: true }
};

let cancelAnim = null;
let lastSeries = null, lastN = null, lastProgress = 0;

export function init(){
  const mode = getMode();
  const canvas = document.getElementById('sirCanvas');
  const schoolSummary = document.getElementById('schoolSummary');
  const uniKpis = document.getElementById('uniKpis');
  const liveKpi = document.getElementById('liveKpi');
  const liveDay = document.getElementById('liveDay');
  const liveI   = document.getElementById('liveI');
  const showControls = document.getElementById('showControls');
  const controlsPanel = document.getElementById('controlsPanel');

  function startIntro(presetKey){
    const p = presets[presetKey];
    const initVals = { S: p.N - p.I0, I: p.I0, R: 0 };
    const series = runSIR(p, initVals, p);
    lastSeries = series; lastN = p.N; lastProgress = 0;

    schoolSummary.hidden = true;
    if (mode === 'school'){ liveKpi.hidden = false; showControls.hidden = true; }

    // ggf. laufende Animation abbrechen
    cancelAnim?.();

    cancelAnim = animateSIR(canvas, series, p.N, {
      duration: 20000, // 20s
      onTick: ({t,I,progress})=>{
        lastProgress = progress;
        if (mode === 'school'){
          liveDay.textContent = 'Tag ' + t;
          liveI.textContent   = Math.round(I);
        }
      },
      onDone: ()=>{
        const stats = statsFromSeries(series, p.N);
        if (mode === 'school'){
          liveKpi.hidden = true;
          schoolSummary.innerHTML = formatSchoolText(stats, presetKey);
          schoolSummary.hidden = false;
          showControls.hidden = false;
        } else {
          uniKpis.innerHTML = formatUniKpis(stats, p);
          uniKpis.hidden = false;
        }
      }
    });
  }

  // Buttons für Presets
  document.querySelectorAll('[data-preset]').forEach(btn=>{
    btn.addEventListener('click', ()=> startIntro(btn.dataset.preset));
  });

  // „Regler anzeigen“ (School): Panel sichtbar machen
  showControls?.addEventListener('click', ()=>{
    controlsPanel?.removeAttribute('hidden');
    controlsPanel?.scrollIntoView({ behavior:'smooth', block:'start' });
  });

  // Initial
  startIntro(mode === 'school' ? 'school_case1' : 'uni_default');

  // Neu zeichnen bei Resize (ohne Animation; aktueller Fortschritt)
  window.addEventListener('resize', ()=>{
    if (lastSeries){ fitCanvas(canvas); drawSIRChart(canvas, lastSeries, lastN, { progress: Math.max(0.01,lastProgress) }); }
  }, { passive:true });
}

function formatSchoolText(stats, presetKey){
  if (presetKey === 'school_case1'){
    return `
      Zu Beginn sind 1 von ${N_SCHOOL} Personen erkrankt.<br>
      Jede kranke Person steckt im Schnitt weniger als eine weitere Person an (Ansteckungszahl 0,8).<br>
      Der Ausbruch endet nach ${stats.duration} Tagen mit insgesamt ${stats.totalInfected} Erkrankten.
      ${stats.totalNotInfected} Personen haben sich nicht angesteckt.
    `;
  } else {
    return `
      Zu Beginn sind 1 von ${N_SCHOOL} Personen erkrankt.<br>
      Jede kranke Person steckt im Schnitt 2 weitere an (Ansteckungszahl 2,0).<br>
      Der Höhepunkt des Ausbruchs wird am Tag ${stats.tPeak} mit ${stats.peakI} Erkrankten erreicht.<br>
      Der Ausbruch endet nach ${stats.duration} Tagen mit insgesamt ${stats.totalInfected} Erkrankten
      und ${stats.totalNotInfected} Personen, die nicht erkrankt sind.
    `;
  }
}

function formatUniKpis(stats, params){
  return `
    <div>Kennzahlen (Uni)</div>
    <ul>
      <li>R₀ = ${(params.beta/params.gamma).toFixed(2)}</li>
      <li>Peak I: ${stats.peakI} am Tag ${stats.tPeak}</li>
      <li>Gesamt infiziert: ${stats.totalInfected}</li>
      <li>Nicht infiziert: ${stats.totalNotInfected}</li>
      <li>Dauer: ${stats.duration} Tage</li>
    </ul>
  `;
}
