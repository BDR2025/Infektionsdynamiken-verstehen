// js/pages/page-model-sir.js
import { getMode } from '../core/mode.js';
import { runSIR, statsFromSeries } from '../models/sir.js';
import { fitCanvas, drawSIRChart, animateSIR } from '../ui/chart.js';

const N_SCHOOL = 100;

// Animationsdauer (ms) – anpassbar
const INTRO_DURATION_MS = {
  school_case1: 12000,
  school_case2: 14000,
  uni_default:  16000
};

const presets = {
  school_case1: { N: N_SCHOOL, I0: 1, beta: (1/5) * 0.8, gamma: 1/5, autoEnd: true, maxDays: 30 },
  school_case2: { N: N_SCHOOL, I0: 1, beta: (1/5) * 2.0, gamma: 1/5, autoEnd: true },
  uni_default:  { N: 1000,     I0: 1, beta: 0.3,        gamma: 1/5, autoEnd: true }
};

let cancelAnim = null;
let lastSeries = null, lastN = null, lastProgress = 0;

export function init(){
  const mode = getMode();

  // Refs
  const canvas = document.getElementById('sirCanvas');

  const kAn = document.getElementById('kAnsteck');
  const kS  = document.getElementById('kGesund');
  const kG  = document.getElementById('kGenesene');

  const btnTry = document.getElementById('btnTry');

  const coach = {
    box:   document.getElementById('coachBox'),
    play:  document.getElementById('coachPlay'),
    video: document.getElementById('coachVideo'),
    sync:  document.getElementById('coachSync')
  };

  const controls = {
    wrap: document.getElementById('controls'),
    r0:   document.getElementById('rR0'),
    r0v:  document.getElementById('rR0v'),
    days: document.getElementById('rDays'),
    daysv:document.getElementById('rDaysv')
  };

  const summary  = document.getElementById('schoolSummary');
  const uniKpis  = document.getElementById('uniKpis');

  // ---- Intro (Fall 1 -> Fall 2) im gleichen Grid ---------------------------------
  function startIntro(presetKey){
    const p = presets[presetKey];
    const initVals = { S: p.N - p.I0, I: p.I0, R: 0 };
    const series = runSIR(p, initVals, p);
    lastSeries = series; lastN = p.N; lastProgress = 0;

    // KPI initial
    const R0 = (p.beta / p.gamma).toFixed(2);
    if (kAn) kAn.textContent = R0;

    // Coach sichtbar lassen (School), Play-Knopf bis User klickt
    showCoach();

    // Chart-Animation
    cancelAnim?.();
    cancelAnim = animateSIR(canvas, series, p.N, {
      duration: INTRO_DURATION_MS[presetKey] || 14000,
      emphasis: 'S', thin: 2, thick: 6,
      showAxes: false,
      labelLine: 'S',
      labelFormatter: ({t,S}) => `Tag ${t} · Gesund: ${Math.round(S)}`,
      onTick: ({S, R, progress})=>{
        lastProgress = progress;
        if (kS) kS.textContent = Math.round(S);
        if (kG) kG.textContent = Math.round(R);
      },
      onDone: ()=>{
        const stats = statsFromSeries(series, p.N);

        if (mode === 'school'){
          // Summary-Text
          summary.innerHTML = formatSchoolText(stats, presetKey);
          summary.hidden = false;

          // Automatisch Fall 2 starten?
          if (presetKey === 'school_case1'){
            setTimeout(()=> startIntro('school_case2'), 600);
          } else {
            // Nach Fall 2: Button "Selbst probieren" hervorheben
            btnTry?.classList.add('btn-primary');
          }
        } else {
          uniKpis.innerHTML = formatUniKpis(stats, p);
          uniKpis.hidden = false;
        }
      }
    });
  }

  // Preset-Buttons
  document.querySelectorAll('[data-preset]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      summary.hidden = true; btnTry?.classList.remove('btn-primary');
      startIntro(btn.dataset.preset);
    });
  });

  // Coach: Play (Autoplay-Policy)
  coach.play?.addEventListener('click', async ()=>{
    try {
      await coach.video?.play();
      coach.play.classList.add('is-hidden');
    } catch (e) {
      coach.video.controls = true; // Fallback
    }
  });
  coach.video?.addEventListener('ended', ()=>{
    coach.play?.classList.remove('is-hidden');
  });

  function showCoach(){
    if (mode !== 'school') return;
    coach.box?.removeAttribute('hidden');
    controls.wrap?.setAttribute('hidden','');
  }

  // Switch: Coach -> Interaktiv (gleiches Panel)
  btnTry?.addEventListener('click', ()=>{
    coach.box?.setAttribute('hidden','');
    try { coach.video?.pause(); } catch {}
    controls.wrap?.removeAttribute('hidden');
    btnTry.classList.remove('btn-primary');
    renderInteractive();
  });

  // ---- Interaktiver Modus ---------------------------------------------------------
  function renderInteractive(){
    // Clamp (2..5 Tage)
    const days = Math.max(2, Math.min(5, parseInt(controls.days.value, 10)));
    controls.days.value = String(days);
    controls.daysv.textContent = String(days);

    const R0 = parseFloat(controls.r0.value);
    controls.r0v.textContent = R0.toFixed(1);

    const gamma = 1 / days;
    const beta  = R0 * gamma;

    const p = { N: N_SCHOOL, beta, gamma };
    const initVals = { S: N_SCHOOL - 1, I: 1, R: 0 };
    const series = runSIR(p, initVals, { autoEnd: true });

    fitCanvas(canvas, 0.62);
    drawSIRChart(canvas, series, p.N, {
      progress: 1,
      emphasis: 'S', thin: 2, thick: 6,
      showAxes: true
    });

    const end = series.at(-1).y;
    if (kAn) kAn.textContent = (beta/gamma).toFixed(2);
    if (kS)  kS.textContent  = Math.round(end[0]);
    if (kG)  kG.textContent  = Math.round(end[2]);
  }

  controls.r0?.addEventListener('input', renderInteractive);
  controls.days?.addEventListener('input', renderInteractive);

  // ---- Resize-Handling ------------------------------------------------------------
  window.addEventListener('resize', ()=>{
    if (controls.wrap && !controls.wrap.hidden){
      renderInteractive();
    } else if (lastSeries){
      fitCanvas(canvas);
      drawSIRChart(canvas, lastSeries, lastN, {
        progress: Math.max(0.01, lastProgress),
        emphasis:'S', thin:2, thick:6, showAxes:false,
        labelLine:'S',
        labelFormatter: ({t,S}) => `Tag ${t} · Gesund: ${Math.round(S)}`
      });
    }
  }, { passive:true });

  // Start
  startIntro(mode === 'school' ? 'school_case1' : 'uni_default');
}

// ---------- Texte ----------
function formatSchoolText(stats, presetKey){
  if (presetKey === 'school_case1'){
    return `
      <p>Zu Beginn ist <strong>eine Person</strong> in dieser Gruppe krank.</p>
      <p>Jede kranke Person steckt im Schnitt <strong>weniger als eine</strong> weitere Person an (Ansteckungszahl&nbsp;0,8).</p>
      <p>Der Ausbruch endet nach <strong>${stats.duration} Tagen</strong> mit insgesamt <strong>${stats.totalInfected} Erkrankten</strong>.
      <strong>${stats.totalNotInfected}</strong> Menschen haben sich nicht angesteckt.</p>
    `;
  } else {
    return `
      <p>Zu Beginn ist <strong>eine Person</strong> in dieser Gruppe krank.</p>
      <p>Jede kranke Person steckt im Schnitt <strong>zwei</strong> weitere an (Ansteckungszahl&nbsp;2,0).</p>
      <p>Der Höhepunkt des Ausbruchs wird am Tag <strong>${stats.tPeak}</strong> mit <strong>${stats.peakI} Erkrankten</strong> erreicht.</p>
      <p>Der Ausbruch endet nach <strong>${stats.duration} Tagen</strong> mit insgesamt <strong>${stats.totalInfected} Erkrankten</strong>
      und <strong>${stats.totalNotInfected}</strong> Menschen, die nicht erkrankt sind.</p>
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
