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

// Fall-Buttons für Puls
const presetBtn = { school_case1: null, school_case2: null };

// CSS einmalig injizieren (inkl. Puls-Style für .btn und .btn-pill)
function ensureInlineStyle() {
  if (document.getElementById('sir-inline-style')) return;
  const css = `
  @keyframes sirPulse {0%{box-shadow:0 0 0 0 rgba(0,158,115,.45)}70%{box-shadow:0 0 0 10px rgba(0,158,115,0)}100%{box-shadow:0 0 0 0 rgba(0,158,115,0)}}
  .btn.is-live, .btn-pill.is-live{animation:sirPulse 1.8s ease-in-out infinite; outline:2px solid #009E73}

  /* Coach-Video & Overlay-Button */
  #coachVideo{background:#fff; display:block; width:100%; height:auto; border-radius:16px}
  #coachVideo::-webkit-media-controls,
  #coachVideo::-webkit-media-controls-enclosure,
  #coachVideo::-webkit-media-controls-overlay-play-button{display:none !important}
  .coach-card{position:relative}
  .coach-unmute{position:absolute; right:12px; bottom:12px; z-index:5; background:#111827; color:#fff; border:0; border-radius:999px; padding:8px 12px; font-size:12px; box-shadow:0 4px 12px rgba(0,0,0,.15); cursor:pointer}
  .coach-unmute.hide{display:none}
  `;
  const el = document.createElement('style');
  el.id = 'sir-inline-style';
  el.textContent = css;
  document.head.appendChild(el);
}

// Puls-Helfer
function markLive(key){ Object.values(presetBtn).forEach(b=>b?.classList.remove('is-live')); presetBtn[key]?.classList.add('is-live'); }
function clearLive(){ Object.values(presetBtn).forEach(b=>b?.classList.remove('is-live')); }

// Autoplay: stumm starten; beim ersten User-Event Ton freischalten
function setupAudioUnlockers(videoEl, unmuteBtn, extraTriggers = []) {
  if (!videoEl) return;

  const unlock = () => {
    try {
      videoEl.muted = false;
      videoEl.play().catch(()=>{ /* ok */ });
      unmuteBtn?.classList.add('hide');
    } catch(_) {}
    window.removeEventListener('pointerdown', unlock, { once:true });
  };

  // globaler Einmal-Klick irgendwo
  window.addEventListener('pointerdown', unlock, { once:true });

  // zusätzliche Trigger (z.B. Fall-Buttons)
  extraTriggers.forEach(el => el?.addEventListener('click', unlock, { once:true }));

  // expliziter Unmute-Button
  unmuteBtn?.addEventListener('click', unlock);
}

// Versuche Autoplay direkt; wenn blockiert → stumm + Unmute anzeigen
function playCoachAutoplay(videoEl, soundBtn){
  if (!videoEl) return;

  // harte Abschaltung sichtbarer Controls
  videoEl.removeAttribute('controls');
  videoEl.setAttribute('playsinline','');
  videoEl.setAttribute('webkit-playsinline','');
  videoEl.setAttribute('x-webkit-airplay','deny');
  videoEl.setAttribute('disablepictureinpicture','');
  videoEl.setAttribute('controlsList','nodownload noplaybackrate noremoteplayback');
  videoEl.loop = false;

  try { videoEl.currentTime = 0; } catch(_){}

  // realistisch: erst einmal STUMM starten (Autoplay-Policies)
  videoEl.muted = true;
  const p = videoEl.play();
  if (p && typeof p.catch === 'function'){
    p.catch(()=>{ /* ignorieren – bleibt stumm */ });
  }
  // Unmute-Button sichtbar lassen – wird per Klick ausgeblendet
  soundBtn?.classList.remove('hide');
}

export function init(){
  ensureInlineStyle();
  const mode = getMode();

  // Refs
  const canvas   = document.getElementById('sirCanvas');
  const summary  = document.getElementById('schoolSummary');
  const btnTry   = document.getElementById('btnTry'); // optional
  const coachVid = document.getElementById('coachVideo');
  const rightCol = coachVid?.parentElement || document.querySelector('.coach-card');

  // KPI/Regler (nur interaktiv)
  const kpiGrid  = document.querySelector('.kpi-grid');
  const ctrlBox  = document.querySelector('.controls.card');
  const r0  = document.getElementById('rR0');   const r0v  = document.getElementById('rR0v');
  const days = document.getElementById('rDays'); const daysv= document.getElementById('rDaysv');
  const kAn = document.getElementById('kAnsteck'), kS = document.getElementById('kGesund'), kG = document.getElementById('kGenesene');

  // Unmute-Overlay anlegen
  let unmuteBtn = null;
  if (rightCol && coachVid){
    rightCol.classList.add('coach-card');
    unmuteBtn = document.createElement('button');
    unmuteBtn.type = 'button';
    unmuteBtn.className = 'coach-unmute hide';
    unmuteBtn.textContent = '🔊 Ton einschalten';
    rightCol.appendChild(unmuteBtn);
    coachVid.addEventListener('ended', ()=> unmuteBtn.classList.add('hide'));
  }

  // Fall-Buttons (für Puls & Audio-Unlock)
  presetBtn.school_case1 = document.querySelector('[data-preset="school_case1"]');
  presetBtn.school_case2 = document.querySelector('[data-preset="school_case2"]');

  // UI-Modi
  function showIntroUI(){
    interactive = false;
    kpiGrid && (kpiGrid.hidden = true);
    ctrlBox && (ctrlBox.hidden = true);
    coachVid && (coachVid.hidden = false);
    btnTry && (btnTry.hidden = false);
  }
  function showInteractiveUI(){
    interactive = true;
    clearLive();
    cancelAnim?.();
    kpiGrid && (kpiGrid.hidden = false);
    ctrlBox && (ctrlBox.hidden = false);
    coachVid && (coachVid.hidden = true);
    summary && (summary.hidden = true);
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

    // Canvas vorbereiten + Coach starten
    fitCanvas(canvas);
    playCoachAutoplay(coachVid, unmuteBtn);
    setupAudioUnlockers(coachVid, unmuteBtn, [presetBtn.school_case1, presetBtn.school_case2, btnTry]);

    // Einen Frame warten → dann animieren (sicherer, falls Layout noch läuft)
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
          if (mode === 'school' && summary){
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
    const d = Math.max(2, Math.min(5, parseInt(days?.value ?? '5', 10)));
    if (days){ days.value = String(d); daysv && (daysv.textContent = String(d)); }
    const R0 = parseFloat(r0?.value ?? '2.0'); r0v && (r0v.textContent = R0.toFixed(1));
    const gamma = 1 / d, beta = R0 * gamma;

    const p = { N: N_SCHOOL, beta, gamma, autoEnd:true };
    const initVals = { S: N_SCHOOL - 1, I: 1, R: 0 };
    const series = runSIR(p, initVals, p);

    fitCanvas(canvas, 0.62);
    drawSIRChart(canvas, series, p.N, { progress:1, emphasis:'S', thin:2, thick:6, showAxes:true });

    const end = series.at(-1).y; // [S,I,R]
    kAn && (kAn.textContent = R0.toFixed(2));
    kS  && (kS.textContent  = Math.round(end[0]));
    kG  && (kG.textContent  = Math.round(end[2]));
  }

  // Events
  document.querySelectorAll('[data-preset]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      clearLive(); cancelAnim?.(); startIntro(btn.dataset.preset);
    });
  });
  btnTry?.addEventListener('click', ()=>{
    try { coachVid.pause(); } catch(_){}
    showInteractiveUI();
  });
  r0?.addEventListener('input', ()=> interactive && renderInteractive());
  days?.addEventListener('input', ()=> interactive && renderInteractive());

  // Startfluss
  startIntro(mode === 'school' ? 'school_case1' : 'uni_default');

  // Resize → defensiv neu zeichnen
  window.addEventListener('resize', ()=>{
    if (!canvas) return;
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
