// js/pages/page-model-seir.js
import { getMode } from '../core/mode.js';
import { runSEIR } from '../models/seir.js';
import { fitCanvas, drawSEIRChart, animateSEIR } from '../ui/chart.js';

const N_SCHOOL = 100;

// Vorgaben (Schule) – exakt nach deinen Spezifikationen
const presets = {
  school_case1: {
    label: 'Fall 1',
    N: N_SCHOOL,
    E0: 0,
    I0: 1,
    beta: 0.33,          // „Ansteckungszahl/Faktor“ in Schul-Sprache (technisch beta)
    sigma: 1/3,          // Inkubationszeit 3 Tage
    gamma: 1/5,          // Infektdauer 5 Tage (nicht genannt, daher Default wie SIR)
    autoEnd: true,
    maxDays: 200
  },
  school_case2: {
    label: 'Fall 2',
    N: N_SCHOOL,
    E0: 0,
    I0: 1,
    beta: 0.5,           // (entspricht R0 ≈ 5 bei gamma=0.1)
    sigma: 1/10,         // Inkubationszeit 10 Tage
    gamma: 1/10,         // Infektdauer 10 Tage
    autoEnd: true,
    maxDays: 200
  },
  // Uni-Default nur als Fallback, wird in School nicht genutzt
  uni_default: {
    N: 1000, E0: 0, I0: 1, beta: 0.3, sigma: 1/3, gamma: 1/5, autoEnd: true, maxDays: 200
  }
};

// Intro-Animationen (ms) – bei Bedarf justierbar
const INTRO_MS = { school_case1: 12000, school_case2: 14000, uni_default: 16000 };

let cancelAnim = null;
let lastSeries = null;
let lastProgress = 0;

export function init(){
  const mode = getMode();

  // Intro-Refs
  const intro = {
    section: document.getElementById('introSection'),
    canvas: document.getElementById('seirCanvas'),
    summary: document.getElementById('schoolSummary'),
    uniKpis: document.getElementById('uniKpis'),
    showControlsBtn: document.getElementById('showControls')
  };

  // Interaktiv-Refs
  const inter = {
    panel: document.getElementById('interactivePanel'),
    canvas: document.getElementById('seirCanvasInteractive'),
    r0: document.getElementById('rR0'),   r0v: document.getElementById('rR0v'),
    inc: document.getElementById('rInc'), incv: document.getElementById('rIncv'),
    days: document.getElementById('rDays'), daysv: document.getElementById('rDaysv'),
    kAn: document.getElementById('kAnsteck'),
    kS: document.getElementById('kGesund'),
    kG: document.getElementById('kGenesene')
  };

  // ---------- Intro (zeigt S,E,I,R; E = orange fett + Label) ----------
  function startIntro(presetKey){
    const p = presets[presetKey];
    const init = { S: p.N - (p.E0||0) - p.I0, E: (p.E0||0), I: p.I0, R: 0 };
    const series = runSEIR(p, init, p);      // [{t, y:[S,E,I,R]}]
    lastSeries = series;
    lastProgress = 0;

    cancelAnim?.();
    cancelAnim = animateSEIR(intro.canvas, series, p.N, {
      duration: INTRO_MS[presetKey] || 14000,
      showAxes: false,
      // visuelle Betonung
      thickE: 8,           // E besonders dick
      thin: 2, thick: 6,   // Basisdicken (S grün dick)
      // Label an E entlang
      labelLine: 'E',
      labelFormatter: ({t,E}) => `Tag ${t} · Exponiert: ${Math.round(E)}`,
      onTick: ({progress}) => { lastProgress = progress; },
      onDone: () => {
        if (presetKey === 'school_case1' && mode === 'school'){
          setTimeout(()=> startIntro('school_case2'), 500);
        } else {
          intro.summary.hidden = false;
          intro.showControlsBtn.hidden = false;
        }
      }
    });
  }

  // Preset-Klicks
  document.querySelectorAll('[data-preset]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      intro.summary.hidden = true;
      intro.showControlsBtn.hidden = true;
      startIntro(btn.dataset.preset);
    });
  });

  // „Zum interaktiven Modell“
  intro.showControlsBtn?.addEventListener('click', ()=>{
    intro.section.hidden = true;
    inter.panel.hidden = false;
    // Schul-Defaults: R0 aus aktuellen p ableiten
    inter.r0.value = "2.0"; inter.r0v.textContent = "2.0";
    inter.inc.value = "3";  inter.incv.textContent = "3";
    inter.days.value = "5"; inter.daysv.textContent = "5";
    renderInteractive();
    inter.panel.scrollIntoView({ behavior:'smooth', block:'start' });
  });

  // initial: Fall 1 (School) oder uni_default
  startIntro(mode === 'school' ? 'school_case1' : 'uni_default');

  // ---------- Interaktiv (kleines Chart mit Achsen + KPI) ----------
  function renderInteractive(){
    // Werte aus Slidern (Schule: Grenzen sinnvoll halten)
    const R0   = parseFloat(inter.r0.value);
    const incD = Math.max(2, Math.min(7, parseInt(inter.inc.value,10)));
    const dayD = Math.max(2, Math.min(5, parseInt(inter.days.value,10)));
    inter.r0v.textContent = R0.toFixed(1);
    inter.incv.textContent = String(incD);
    inter.daysv.textContent = String(dayD);

    const gamma = 1 / dayD;
    const sigma = 1 / incD;
    const beta  = R0 * gamma;

    const p = { N: N_SCHOOL, beta, sigma, gamma };
    const init = { S: N_SCHOOL-1, E: 0, I: 1, R: 0 };
    const series = runSEIR(p, init, { autoEnd:true });

    fitCanvas(inter.canvas, 0.62);
    drawSEIRChart(inter.canvas, series, p.N, {
      progress: 1,
      showAxes: true,
      thickE: 8, thin: 2, thick: 6
    });

    // KPI (Schule): Faktor (R0), Gesunde = S_end, Genesene = R_end
    const end = series.at(-1).y; // [S,E,I,R]
    inter.kAn.textContent = R0.toFixed(2);
    inter.kS.textContent  = Math.round(end[0]);
    inter.kG.textContent  = Math.round(end[3]);
  }

  inter.r0?.addEventListener('input', renderInteractive);
  inter.inc?.addEventListener('input', renderInteractive);
  inter.days?.addEventListener('input', renderInteractive);

  // Resize neu zeichnen
  window.addEventListener('resize', ()=>{
    if (!intro.section.hidden && lastSeries){
      fitCanvas(intro.canvas);
      drawSEIRChart(intro.canvas, lastSeries, presets.school_case1.N, {
        progress: Math.max(0.01, lastProgress),
        showAxes: false, thickE: 8, thin: 2, thick: 6,
        labelLine: 'E',
        labelFormatter: ({t,E}) => `Tag ${t} · Exponiert: ${Math.round(E)}`
      });
    }
    if (!inter.panel.hidden) renderInteractive();
  }, { passive:true });
}
