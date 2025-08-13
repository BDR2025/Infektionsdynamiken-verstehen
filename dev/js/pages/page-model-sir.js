// js/pages/page-model-sir.js
import { getMode } from '../core/mode.js';
import { runSIR, statsFromSeries } from '../models/sir.js';
import { fitCanvas, drawSIRChart, animateSIR } from '../ui/chart.js';

const N_SCHOOL = 100;

// Dauer der Intro-Animationen (ms) – zentral justierbar
const INTRO_DURATION_MS = {
  school_case1: 12000,
  school_case2: 14000,
  uni_default:  16000,
};

const presets = {
  school_case1: { N: N_SCHOOL, I0: 1, beta: (1/5)*0.8, gamma: 1/5, autoEnd: true, maxDays: 30 },
  school_case2: { N: N_SCHOOL, I0: 1, beta: (1/5)*2.0, gamma: 1/5, autoEnd: true },
  uni_default:  { N: 1000,     I0: 1, beta: 0.3,      gamma: 1/5, autoEnd: true },
};

// globaler Animations-Abbrucher
let cancelAnim = null;
// letzter Intro-Stand (für Resize-Redraw)
let lastSeries = null, lastN = null, lastProgress = 0;

export function init(){
  const mode = getMode();

  // ---------- DOM-Refs ----------
  const intro = {
    section: document.getElementById('introSection'),
    canvas: document.getElementById('sirCanvas'),
    summary: document.getElementById('schoolSummary'),
    uniKpis: document.getElementById('uniKpis'),
    showControlsBtn: document.getElementById('showControls'),
  };

  const inter = {
    panel: document.getElementById('interactivePanel'),
    canvas: document.getElementById('sirCanvasInteractive'),
    r0: document.getElementById('rR0'),
    r0v: document.getElementById('rR0v'),
    days: document.getElementById('rDays'),
    daysv: document.getElementById('rDaysv'),
    kAn: document.getElementById('kAnsteck'),
    kS: document.getElementById('kGesund'),
    kG: document.getElementById('kGenesene'),
  };

  // Coach‑Video (optional vorhanden)
  const coach = {
    video: document.getElementById('coachVideo'),
    toggleBtn: document.getElementById('coachToggle'),
    syncChk: document.getElementById('coachSync'),
  };

  // ---------- Intro: Animation + (optional) Video‑Sync ----------
  function playIntroWithCoach(series, N, { durationMs=12000 } = {}){
    lastSeries = series; lastN = N; lastProgress = 0;

    // Wenn kein Video oder Sync aus → normale Canvas-Animation
    const wantSync = !!(coach.video && (coach.syncChk?.checked));
    if (!wantSync){
      cancelAnim?.();
      cancelAnim = animateSIR(intro.canvas, series, N, {
        duration: durationMs,
        emphasis: 'S',
        thin: 2, thick: 6,
        showAxes: false,
        labelLine: 'S',
        labelFormatter: ({t,S}) => `Tag ${t} · Gesund: ${Math.round(S)}`,
        onTick: ({progress}) => { lastProgress = progress; },
      });
      // Video (falls vorhanden) stumm anwerfen – Autoplay-Sicherheit
      if (coach.video){
        try { coach.video.currentTime = 0; } catch {}
        coach.video.muted = true;
        coach.video.play().catch(()=>{ /* wartet auf User */ });
      }
      return;
    }

    // Harte Synchronisation: Chart-Frame folgt der Videozeit
    cancelAnim?.();
    fitCanvas(intro.canvas);
    let raf = 0;

    const drawByVideo = ()=>{
      const v = coach.video;
      const dur = Math.max(0.1, v.duration || durationMs/1000);
      const p = Math.min(1, Math.max(0, v.currentTime / dur));
      lastProgress = p;

      drawSIRChart(intro.canvas, series, N, {
        progress: p,
        emphasis: 'S',
        thin: 2, thick: 6,
        showAxes: false,
        labelLine: 'S',
        labelFormatter: ({t,S}) => `Tag ${t} · Gesund: ${Math.round(S)}`,
      });

      if (!v.paused && !v.ended) raf = requestAnimationFrame(drawByVideo);
    };

    const onPlay  = ()=> { cancelAnimationFrame(raf); raf = requestAnimationFrame(drawByVideo); };
    const onPause = ()=> cancelAnimationFrame(raf);
    const onEnded = ()=> cancelAnimationFrame(raf);

    coach.video.removeEventListener('play', onPlay);
    coach.video.removeEventListener('pause', onPause);
    coach.video.removeEventListener('ended', onEnded);
    coach.video.addEventListener('play', onPlay);
    coach.video.addEventListener('pause', onPause);
    coach.video.addEventListener('ended', onEnded);

    try { coach.video.currentTime = 0; } catch {}
    coach.video.muted = true;
    coach.video.play().catch(()=>{ /* wartet auf User */ });
    onPlay();
  }

  // startet eine Intro-Sequenz für ein Preset
  function startIntro(presetKey){
    const p = presets[presetKey];
    const initVals = { S: p.N - p.I0, I: p.I0, R: 0 };
    const series = runSIR(p, initVals, p);

    // UI vorab leeren
    if (intro.summary) intro.summary.hidden = true;
    if (intro.uniKpis) intro.uniKpis.hidden = true;
    if (intro.showControlsBtn) intro.showControlsBtn.hidden = true;

    playIntroWithCoach(series, p.N, { durationMs: INTRO_DURATION_MS[presetKey] || 14000 });

    // Abschluss-Callback getrennt steuern:
    // Wir hängen uns an setTimeout in Dauer der Animation (robust genug für Intro)
    const finishMs = INTRO_DURATION_MS[presetKey] || 14000;
    window.setTimeout(()=>{
      const stats = statsFromSeries(series, p.N);
      if (getMode() === 'school'){
        if (intro.summary){
          intro.summary.innerHTML = formatSchoolText(stats, presetKey);
          intro.summary.hidden = false;
        }
        if (intro.showControlsBtn) intro.showControlsBtn.hidden = false;

        // Automatisch von Fall 1 → Fall 2
        if (presetKey === 'school_case1'){
          setTimeout(()=> startIntro('school_case2'), 500);
        }
      } else {
        if (intro.uniKpis){
          intro.uniKpis.innerHTML = formatUniKpis(stats, p);
          intro.uniKpis.hidden = false;
        }
      }
    }, finishMs + 30);
  }

  // Preset-Buttons (School)
  document.querySelectorAll('[data-preset]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      startIntro(btn.dataset.preset);
    });
  });

  // Coach-Controls
  coach.toggleBtn?.addEventListener('click', ()=>{
    const v = coach.video;
    if (!v) return;
    if (v.paused) { v.play().catch(()=>{}); }
    else          { v.pause(); }
    // Optional: beim Klick Ton togglen
    v.muted = !v.muted;
  });
  coach.syncChk?.addEventListener('change', ()=>{
    // Bei Umschalten neu starten, damit die gewählte Logik greift
    // (wir nehmen den aktuellen Fall als Referenz; default Fall 2 im School-Modus)
    const fallback = getMode() === 'school' ? 'school_case2' : 'uni_default';
    startIntro(fallback);
  });

  // „Zum interaktiven Modell“
  intro.showControlsBtn?.addEventListener('click', ()=>{
    intro.section.hidden = true;
    inter.panel.hidden = false;
    // Start wie Fall 2
    inter.r0.value = '2.0'; inter.r0v.textContent = '2.0';
    inter.days.value = '5'; inter.daysv.textContent = '5';
    renderInteractive();
    inter.panel.scrollIntoView({ behavior:'smooth', block:'start' });
  });

  // Initiale Intro-Sequenz starten
  startIntro(mode === 'school' ? 'school_case1' : 'uni_default');

  // ---------- Interaktive Ansicht (mit Achsen & KPI) ----------
  function renderInteractive(){
    // Clamp (2–5 Tage) – auch wenn im HTML später etwas anderes steht
    const days = Math.max(2, Math.min(5, parseInt(inter.days.value, 10) || 5));
    inter.days.value = String(days);
    inter.daysv.textContent = String(days);

    const R0 = Number.parseFloat(inter.r0.value) || 2.0;
    inter.r0v.textContent = R0.toFixed(1);

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
      showAxes: true,
    });

    // KPI: Ansteckungsfaktor (R0), Gesunde (S), Genesene (R)
    const [S_end,, R_end] = series.at(-1).y;
    inter.kAn.textContent = R0.toFixed(2);
    inter.kS.textContent  = Math.round(S_end);
    inter.kG.textContent  = Math.round(R_end);
  }

  inter.r0?.addEventListener('input', renderInteractive);
  inter.days?.addEventListener('input', renderInteractive);

  // ---------- Resize-Handling ----------
  window.addEventListener('resize', ()=>{
    if (!intro.section.hidden && lastSeries){
      fitCanvas(intro.canvas);
      drawSIRChart(intro.canvas, lastSeries, lastN, {
        progress: Math.max(0.01, lastProgress),
        emphasis: 'S',
        thin: 2, thick: 6,
        showAxes: false,
        labelLine: 'S',
        labelFormatter: ({t,S}) => `Tag ${t} · Gesund: ${Math.round(S)}`,
      });
    }
    if (!inter.panel.hidden){
      renderInteractive();
    }
  }, { passive:true });
}

// ---------- Textausgaben ----------
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
