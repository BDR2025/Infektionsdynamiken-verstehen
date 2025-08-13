import { getMode } from '../core/mode.js';
import { runSIR, statsFromSeries } from '../models/sir.js';
import { fitCanvas, drawSIRChart, animateSIR } from '../ui/chart.js';

const N_SCHOOL = 100;

// Dauer der Intro-Animationen (ms) – leicht anpassbar, z. B. für Avatar-Timing
const INTRO_DURATION_MS = {
  school_case1: 12000, // schneller & weich
  school_case2: 14000,
  uni_default:  16000
};

const presets = {
  school_case1: { N: N_SCHOOL, I0: 1, beta: (1/5)*0.8, gamma: 1/5, autoEnd: true, maxDays: 30 },
  school_case2: { N: N_SCHOOL, I0: 1, beta: (1/5)*2.0, gamma: 1/5, autoEnd: true },
  uni_default:  { N: 1000,     I0: 1, beta: 0.3,      gamma: 1/5, autoEnd: true }
};

let cancelAnim = null;
let lastSeries = null, lastN = null, lastProgress = 0;

export function init(){
  const mode = getMode();

  // Intro-Refs
  const intro = {
    section: document.getElementById('introSection'),
    canvas: document.getElementById('sirCanvas'),
    summary: document.getElementById('schoolSummary'),
    uniKpis: document.getElementById('uniKpis'),
    showControlsBtn: document.getElementById('showControls')
  };

  // Interaktiv-Refs (School)
  const inter = {
    panel: document.getElementById('interactivePanel'),
    canvas: document.getElementById('sirCanvasInteractive'),
    r0: document.getElementById('rR0'),
    r0v: document.getElementById('rR0v'),
    days: document.getElementById('rDays'),
    daysv: document.getElementById('rDaysv'),
    kAn: document.getElementById('kAnsteck'),
    kS: document.getElementById('kGesund'),
    kI: document.getElementById('kErkrankt')
  };

  // ---------- Intro: Abspielen Fall 1 → automatisch Fall 2 ----------
  function startIntro(presetKey){
    const p = presets[presetKey];
    const initVals = { S: p.N - p.I0, I: p.I0, R: 0 };
    const series = runSIR(p, initVals, p);
    lastSeries = series; lastN = p.N; lastProgress = 0;

    // laufende Animation stoppen
    cancelAnim?.();

    // Intro: großes Chart, grüne Linie betont, Label „Gesund: …“
    cancelAnim = animateSIR(intro.canvas, series, p.N, {
      duration: INTRO_DURATION_MS[presetKey] || 14000,
      emphasis: 'S',
      thin: 2,
      thick: 6,               // grüne Linie 3-4x so dick
      showAxes: false,
      labelLine: 'S',
      labelFormatter: ({t,S}) => `Tag ${t} · Gesund: ${Math.round(S)}`,
      onTick: ({progress}) => { lastProgress = progress; },
      onDone: () => {
        // Reihenfolge: Fall 1 → automatisch Fall 2; danach Zusammenfassung & Button
        if (presetKey === 'school_case1' && mode === 'school'){
          setTimeout(()=> startIntro('school_case2'), 500);
        } else {
          const stats = statsFromSeries(series, p.N);
          if (mode === 'school'){
            intro.summary.innerHTML = formatSchoolText(stats, presetKey);
            intro.summary.hidden = false;
            intro.showControlsBtn.hidden = false; // „Zum interaktiven Modell“
          } else {
            intro.uniKpis.innerHTML = formatUniKpis(stats, p);
            intro.uniKpis.hidden = false;
          }
        }
      }
    });
  }

  // Preset-Buttons (School)
  document.querySelectorAll('[data-preset]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      intro.summary.hidden = true;
      intro.showControlsBtn.hidden = true;
      startIntro(btn.dataset.preset);
    });
  });

  // „Zum interaktiven Modell“ → interaktives Grid zeigen
  intro.showControlsBtn?.addEventListener('click', ()=>{
    intro.section.hidden = true;
    inter.panel.hidden = false;
    // Startwerte aus Fall 2 übernehmen
    inter.r0.value = "2.0"; inter.r0v.textContent = "2.0";
    inter.days.value = "5"; inter.daysv.textContent = "5";
    renderInteractive();
    inter.panel.scrollIntoView({ behavior:'smooth', block:'start' });
  });

  // Initiale Intro-Sequenz
  startIntro(mode === 'school' ? 'school_case1' : 'uni_default');

  // ---------- Interaktive Ansicht (mit Achsen & KPI) ----------
  function renderInteractive(){
    const R0 = parseFloat(inter.r0.value);
    const days = parseInt(inter.days.value, 10);
    inter.r0v.textContent = R0.toFixed(1);
    inter.daysv.textContent = String(days);

    const gamma = 1 / days;
    const beta  = R0 * gamma;
    const p = { N: N_SCHOOL, beta, gamma };
    const initVals = { S: N_SCHOOL - 1, I: 1, R: 0 };

    const series = runSIR(p, initVals, { autoEnd:true });
    fitCanvas(inter.canvas, 0.62);
    drawSIRChart(inter.canvas, series, p.N, {
      progress: 1,
      emphasis: 'S',
      thin: 2, thick: 6,
      showAxes: true
    });

    // KPI (einfach & klar): R0, Endwerte S/I
    const end = series.at(-1).y;
    inter.kAn.textContent = R0.toFixed(2);
    inter.kS.textContent  = Math.round(end[0]);
    inter.kI.textContent  = Math.round(end[1]);
  }

  inter.r0?.addEventListener('input', renderInteractive);
  inter.days?.addEventListener('input', renderInteractive);

  // ---------- Resize-Handling ----------
  window.addEventListener('resize', ()=>{
    if (!intro.section.hidden && lastSeries){
      fitCanvas(intro.canvas);
      drawSIRChart(intro.canvas, lastSeries, lastN, {
        progress: Math.max(0.01, lastProgress),
        emphasis: 'S', thin:2, thick:6, showAxes:false,
        labelLine: 'S',
        labelFormatter: ({t,S}) => `Tag ${t} · Gesund: ${Math.round(S)}`
      });
    }
    if (!inter.panel.hidden){
      renderInteractive();
    }
  }, { passive:true });
}

function formatSchoolText(stats, presetKey){
  // freundliche Formulierung für „Gruppe mit 100 Menschen“
  if (presetKey === 'school_case1'){
    return `
      Zu Beginn ist <strong>eine Person</strong> in dieser Gruppe krank.<br>
      Jede kranke Person steckt im Schnitt <strong>weniger als eine</strong> weitere Person an (Ansteckungszahl&nbsp;0,8).<br>
      Der Ausbruch endet nach <strong>${stats.duration} Tagen</strong> mit insgesamt <strong>${stats.totalInfected} Erkrankten</strong>.
      <strong>${stats.totalNotInfected}</strong> Menschen haben sich nicht angesteckt.
    `;
  } else {
    return `
      Zu Beginn ist <strong>eine Person</strong> in dieser Gruppe krank.<br>
      Jede kranke Person steckt im Schnitt <strong>zwei</strong> weitere an (Ansteckungszahl&nbsp;2,0).<br>
      Der Höhepunkt des Ausbruchs wird am Tag <strong>${stats.tPeak}</strong> mit <strong>${stats.peakI} Erkrankten</strong> erreicht.<br>
      Der Ausbruch endet nach <strong>${stats.duration} Tagen</strong> mit insgesamt <strong>${stats.totalInfected} Erkrankten</strong>
      und <strong>${stats.totalNotInfected}</strong> Menschen, die nicht erkrankt sind.
    `;
  }
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
    </ul>
  `;
}
