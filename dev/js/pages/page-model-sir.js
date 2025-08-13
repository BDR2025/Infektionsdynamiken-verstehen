// js/pages/page-model-sir.js
import { getMode } from '../core/mode.js';
import { runSIR, statsFromSeries } from '../models/sir.js';
import { fitCanvas, drawSIRChart, animateSIR } from '../ui/chart.js';

const N_SCHOOL = 100;

// Dauer (ms) der Intro-Sequenzen – leicht justierbar
const INTRO_DURATION_MS = {
  school_case1: 12000,
  school_case2: 14000,
  uni_default:  16000
};

// Presets (R0 = beta/gamma)
const presets = {
  school_case1: { N: N_SCHOOL, I0: 1, beta: (1/5) * 0.8, gamma: 1/5, autoEnd: true, maxDays: 30 },
  school_case2: { N: N_SCHOOL, I0: 1, beta: (1/5) * 2.0, gamma: 1/5, autoEnd: true },
  uni_default:  { N: 1000,     I0: 1, beta: 0.3,         gamma: 1/5, autoEnd: true }
};

// --- State ---
let cancelAnim = null;
let lastSeries = null, lastN = null, lastProgress = 0;
let interactive = false;

// Fall-Buttons für den pulsierenden Status
const presetBtn = { school_case1: null, school_case2: null };
function markLive(key){
  Object.values(presetBtn).forEach(b => b?.classList.remove('is-live'));
  presetBtn[key]?.classList.add('is-live');
}
function clearLive(){
  Object.values(presetBtn).forEach(b => b?.classList.remove('is-live'));
}

// Coach-Video Autoplay (weiß, ohne Controls)
function playCoachAutoplay(videoEl, { reset=true } = {}){
  if (!videoEl) return;
  videoEl.controls = false;
  videoEl.style.backgroundColor = '#fff';
  videoEl.setAttribute('playsinline','');
  videoEl.setAttribute('muted',''); // für Autoplay-Sicherheit
  // Wir versuchen mit Ton; wenn blockiert, dann stumm
  if (reset) { try { videoEl.currentTime = 0; } catch(_){} }
  videoEl.muted = false;
  const tryWithSound = videoEl.play();
  tryWithSound?.catch?.(() => {
    videoEl.muted = true;
    return videoEl.play().catch(()=>{ /* still ok */ });
  });
}

export function init(){
  const mode = getMode();

  // --- DOM Refs ---
  const canvas = document.getElementById('sirCanvas');
  const summary = document.getElementById('schoolSummary');
  const btnTry  = document.getElementById('btnTry');

  // rechte Spalte
  const coachVideo = document.getElementById('coachVideo');
  const kpiGrid    = document.querySelector('.kpi-grid');
  const ctrlBox    = document.querySelector('.controls.card');

  // Regler/KPI (nur interaktiv)
  const r0  = document.getElementById('rR0');
  const r0v = document.getElementById('rR0v');
  const days = document.getElementById('rDays');
  const daysv= document.getElementById('rDaysv');
  const kAn = document.getElementById('kAnsteck');
  const kS  = document.getElementById('kGesund');
  const kG  = document.getElementById('kGenesene');

  // Fall-Buttons referenzieren
  presetBtn.school_case1 = document.querySelector('[data-preset="school_case1"]');
  presetBtn.school_case2 = document.querySelector('[data-preset="school_case2"]');

  // --- Intro UI: Coach sichtbar, KPI/Regler verborgen ---
  function showIntroUI(){
    interactive = false;
    kpiGrid && (kpiGrid.hidden = true);
    ctrlBox && (ctrlBox.hidden = true);
    coachVideo && (coachVideo.hidden = false);
    btnTry && (btnTry.hidden = false);
  }

  // --- Interaktive UI: Coach weg, KPI/Regler sichtbar ---
  function showInteractiveUI(){
    interactive = true;
    clearLive();
    cancelAnim?.(); // Animation stoppen
    kpiGrid && (kpiGrid.hidden = false);
    ctrlBox && (ctrlBox.hidden = false);
    coachVideo && (coachVideo.hidden = true);
    summary && (summary.hidden = true);
    renderInteractive();  // zeichnet Achsen + KPIs
  }

  // --- Animation/Intro starten ---
  function startIntro(presetKey){
    const p = presets[presetKey];
    const initVals = { S: p.N - p.I0, I: p.I0, R: 0 };
    const series = runSIR(p, initVals, p);

    lastSeries = series; lastN = p.N; lastProgress = 0;
    showIntroUI();
    markLive(presetKey);
    cancelAnim?.();

    // Canvas vorbereiten & Coach starten
    fitCanvas(canvas);
    playCoachAutoplay(coachVideo, { reset:true });

    cancelAnim = animateSIR(canvas, series, p.N, {
      duration: INTRO_DURATION_MS[presetKey] || 14000,
      emphasis: 'S',         // grüne Linie dicker
      thin: 2, thick: 6,
      showAxes: false,
      labelLine: 'S',
      labelFormatter: ({t,S}) => `Tag ${t} · Gesund: ${Math.round(S)}`,
      onTick: ({progress}) => { lastProgress = progress; },
      onDone: () => {
        if (presetKey === 'school_case1' && mode === 'school'){
          // Auto weiter zu Fall 2
          setTimeout(()=> startIntro('school_case2'), 400);
        } else {
          clearLive();
          const stats = statsFromSeries(series, p.N);
          if (mode === 'school' && summary){
            summary.innerHTML = formatSchoolText(stats, presetKey);
