// js/pages/page-model-sir.js
import { getMode } from '../core/mode.js';
import { runSIR, statsFromSeries } from '../models/sir.js';
import { fitCanvas, drawSIRChart, animateSIR } from '../ui/chart.js';

const N_SCHOOL = 100;
const INTRO_DURATION_MS = { school_case1: 12000, school_case2: 14000, uni_default: 16000 };

const presets = {
  school_case1: { N: N_SCHOOL, I0: 1, beta: (1/5)*0.8, gamma: 1/5, autoEnd: true, maxDays: 30 },
  school_case2: { N: N_SCHOOL, I0: 1, beta: (1/5)*2.0, gamma: 1/5, autoEnd: true },
  uni_default:  { N: 1000,     I0: 1, beta: 0.3,      gamma: 1/5, autoEnd: true }
};

// --- State ---
let cancelAnim = null;
let lastSeries = null, lastN = null, lastProgress = 0;
let interactive = false;
let videoStarted = false; // merken, ob Video schon gestartet wurde
let tryPulseActive = false; // NEU: Status für roten Try-Puls

// Fall-Buttons für Puls
const presetBtn = { school_case1: null, school_case2: null };

// CSS für Puls-Effekt (weicher Glow)
function ensureInlineStyle() {
  if (document.getElementById('sir-inline-style')) return;
  const css = `
  @keyframes sirPulse {
    0%   { box-shadow: 0 0 0 0 rgba(0,158,115,0.6); }
    40%  { box-shadow: 0 0 0 6px rgba(0,158,115,0.3); }
    70%  { box-shadow: 0 0 0 14px rgba(0,158,115,0); }
    100% { box-shadow: 0 0 0 0 rgba(0,158,115,0); }
  }
  .btn.is-live, .btn-pill.is-live {
    animation: sirPulse 1.8s ease-in-out infinite;
    border-color: #009E73;
  }
  #coachVideo{background:#fff; display:block; width:100%; height:auto; border-radius:16px}
  #coachVideo::-webkit-media-controls,
  #coachVideo::-webkit-media-controls-enclosure,
  #coachVideo::-webkit-media-controls-overlay-play-button{display:none !important}
  `;
  const el = document.createElement('style');
  el.id = 'sir-inline-style';
  el.textContent = css;
  document.head.appendChild(el);
}

// Puls-Helfer
function markLive(key){ Object.values(presetBtn).forEach(b=>b?.classList.remove('is-live')); presetBtn[key]?.classList.add('is-live'); }
function clearLive(){ Object.values(presetBtn).forEach(b=>b?.classList.remove('is-live')); }

// Autoplay: stumm starten (für Policies)
function playCoachAutoplay(videoEl){
  if (!videoEl) return;
  videoEl.removeAttribute('controls');
  videoEl.setAttribute('playsinline','');
  videoEl.setAttribute('webkit-playsinline','');
  videoEl.muted = true;
  videoEl.play().catch(()=>{});
}

export function init(){
  ensureInlineStyle();
  const mode = getMode();

  // Refs
  const canvas   = document.getElementById('sirCanvas');
  const summary  = document.getElementById('schoolSummary');
  const btnTry   = document.getElementById('btnTry');
  const coachVid = document.getElementById('coachVideo');

  // KPI/Regler (nur interaktiv)
  const kpiGrid  = document.querySelector('.kpi-grid');
  const ctrlBox  = document.querySelector('.controls.card');
  const r0  = document.getElementById('rR0');   const r0v  = document.getElementById('rR0v');
  const days = document.getElementById('rDays'); const daysv= document.getElementById('rDaysv');
  const kAn = document.getElementById('kAnsteck'), kS = document.getElementById('kGesund'), kG = document.getElementById('kGenesene');

  // Fall-Buttons
  presetBtn.school_case1 = document.querySelector('[data-preset="school_case1"]');
  presetBtn.school_case2 = document.querySelector('[data-preset="school_case2"]');

  // NEU: Try-Puls 4 Sek. vor Videoende
  if (coachVid && btnTry) {
    coachVid.addEventListener('timeupdate', () => {
      if (!tryPulseActive && coachVid.duration && (coachVid.duration - coachVid.currentTime) <= 4) {
        btnTry.classList.add('pulse-try');
        tryPulseActive = true;
      }
    });
    btnTry.addEventListener('click', () => {
      btnTry.classList.remove('pulse-try');
      tryPulseActive = false;
    });
  }

  // UI-Modi
  function showIntroUI(){
    interactive = false;
    kpiGrid.hidden = true;
    ctrlBox.hidden = true;
    coachVid.hidden = false;
    btnTry.hidden = false;
  }
  function showInteractiveUI(){
    interactive = true;
    clearLive();
    cancelAnim?.();
    kpiGrid.hidden = false;
    ctrlBox.hidden = false;
    coachVid.hidden = true;
    summary.hidden = true;
    renderInteractive();
  }

  // Intro starten
  function startIntro(presetKey){
    const p = presets[presetKey];
    const initVals = { S: p.N - p.I0, I: p.I0, R: 0 };
    const series = runSIR(p, initVals, p);

    lastSeries = series; lastN = p.N; lastProgress = 0;
    showIntroUI();
    markLive(presetKey);
    cancelAnim?.();

    fitCanvas(canvas);

    if (!videoStarted) {
      playCoachAutoplay(coachVid);
      videoStarted = true;
    }

    requestAnimationFrame(()=>{
      cancelAnim = animateSIR(canvas, series, p.N, {
        duration: INTRO_DURATION_MS[presetKey] || 14000,
        emphasis: 'S', thin: 2, thick: 6, showAxes: false,
        labelLine: 'S',
        labelFormatter: ({t,S}) => `Tag ${t} · Gesund: ${Math.round(S)}`,
        onTick: ({progress}) => { lastProgress = progress; },
        onDone: () => {
          clearLive();
          const stats = statsFromSeries(series, p.N);
          if (mode === 'school'){
            summary.innerHTML = formatSchoolText(stats, presetKey);
            summary.hidden = false;
          }
          if (presetKey === 'school_case1' && mode === 'school'){
            setTimeout(()=> startIntro('school_case2'), 450);
          }
        }
      });
    });
  }

  // Interaktive Darstellung
  function renderInteractive(){
    const d = Math.max(2, Math.min(5, parseInt(days.value || '5', 10)));
    days.value = String(d); daysv.textContent = String(d);
    const R0 = parseFloat(r0.value || '2.0'); r0v.textContent = R0.toFixed(1);
    const gamma = 1 / d, beta = R0 * gamma;

    const p = { N: N_SCHOOL, beta, gamma, autoEnd:true };
    const initVals = { S: N_SCHOOL - 1, I: 1, R: 0 };
    const series = runSIR(p, initVals, p);

    fitCanvas(canvas, 0.62);
    drawSIRChart(canvas, series, p.N, { progress:1, emphasis:'S', thin:2, thick:6, showAxes:true });

    const end = series.at(-1).y;
    kAn.textContent = R0.toFixed(2);
    kS.textContent  = Math.round(end[0]);
    kG.textContent  = Math.round(end[2]);
  }

  // Events
  document.querySelectorAll('[data-preset]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      clearLive(); cancelAnim?.(); startIntro(btn.dataset.preset);
    });
  });
  btnTry.addEventListener('click', showInteractiveUI);
  r0.addEventListener('input', ()=> interactive && renderInteractive());
  days.addEventListener('input', ()=> interactive && renderInteractive());

  // Startfluss
  startIntro(mode === 'school' ? 'school_case1' : 'uni_default');

  // Resize
  window.addEventListener('resize', ()=>{
    if (interactive){
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
}

// Texte
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
