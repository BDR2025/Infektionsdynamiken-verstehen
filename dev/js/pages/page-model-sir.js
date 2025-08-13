import { getMode } from '../core/mode.js';
import { runSIR, statsFromSeries } from '../models/sir.js';
import { drawSIRChart } from '../ui/chart.js';

const N_SCHOOL = 100;
const presets = {
  school_case1: { N: N_SCHOOL, I0: 1, beta: (1/5) * 0.8, gamma: 1/5, autoEnd: true, maxDays: 30 },
  school_case2: { N: N_SCHOOL, I0: 1, beta: (1/5) * 2.0, gamma: 1/5, autoEnd: true },
  uni_default:  { N: 1000, I0: 1, beta: 0.3, gamma: 1/5, autoEnd: true }
};

let currentPreset = 'school_case1';

export function init(){
  const mode = getMode();
  const canvas = document.getElementById('sirCanvas');
  const schoolSummary = document.getElementById('schoolSummary');
  const uniKpis = document.getElementById('uniKpis');

  function render(presetKey){
    currentPreset = presetKey;
    const p = presets[presetKey];
    const initVals = { S: p.N - p.I0, I: p.I0, R: 0 };
    const series = runSIR(p, initVals, p);
    drawSIRChart(canvas, series, p.N);
    const stats = statsFromSeries(series, p.N);

    if (mode === 'school'){
      schoolSummary.innerHTML = formatSchoolText(stats, presetKey);
      uniKpis.hidden = true;
      schoolSummary.hidden = false;
    } else {
      uniKpis.innerHTML = formatUniKpis(stats, p);
      schoolSummary.hidden = true;
      uniKpis.hidden = false;
    }
  }

  document.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      render(btn.dataset.preset);
    });
  });

  render(mode === 'school' ? 'school_case1' : 'uni_default');
}

function formatSchoolText(stats, presetKey){
  if (presetKey === 'school_case1'){
    return `
      Zu Beginn sind 1 von ${N_SCHOOL} Personen erkrankt.<br>
      Jede kranke Person steckt im Schnitt weniger als eine weitere Person an (Ansteckungszahl 0,8).<br>
      Der Ausbruch endet nach ${stats.duration} Tagen mit insgesamt ${stats.totalInfected} Erkrankten.
      ${stats.totalNotInfected} Personen haben sich nicht angesteckt.
    `;
  } else {
    return `
      Zu Beginn sind 1 von ${N_SCHOOL} Personen erkrankt.<br>
      Jede kranke Person steckt im Schnitt 2 weitere an (Ansteckungszahl 2,0).<br>
      Der Höhepunkt des Ausbruchs wird am Tag ${stats.tPeak} mit ${stats.peakI} Erkrankten erreicht.<br>
      Der Ausbruch endet nach ${stats.duration} Tagen mit insgesamt ${stats.totalInfected} Erkrankten
      und ${stats.totalNotInfected} Personen, die nicht erkrankt sind.
    `;
  }
}

function formatUniKpis(stats, params){
  return `
    <div>Kennzahlen (Uni)</div>
    <ul>
      <li>R₀ = ${(params.beta / params.gamma).toFixed(2)}</li>
      <li>Peak I: ${stats.peakI} am Tag ${stats.tPeak}</li>
      <li>Gesamt infiziert: ${stats.totalInfected}</li>
      <li>Nicht infiziert: ${stats.totalNotInfected}</li>
      <li>Dauer: ${stats.duration} Tage</li>
    </ul>
  `;
}
