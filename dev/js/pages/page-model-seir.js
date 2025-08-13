import { getMode } from '../core/mode.js';
import { runSEIR } from '../models/seir.js';
import { fitCanvas, drawSIRChart, animateSIR } from '../ui/chart.js'; // drawSIRChart kann S/E/I/R rendern; wir nutzen S/I/R

const N_SCHOOL = 100;
const INTRO_DURATION_MS = { school_case1: 12000, school_case2: 14000, uni_default: 16000 };

const presets = {
  // R0 = beta/gamma; sigma = 1/incubation
  school_case1: { N:N_SCHOOL, I0:1, E0:0, beta:(1/5)*0.8, gamma:1/5, sigma:1/3, autoEnd:true, maxDays:60 },
  school_case2: { N:N_SCHOOL, I0:1, E0:0, beta:(1/5)*2.0, gamma:1/5, sigma:1/3, autoEnd:true },
  uni_default:  { N:1000,     I0:1, E0:0, beta:0.3,       gamma:1/5, sigma:1/3, autoEnd:true }
};

let cancelAnim = null;

export function init(){
  const mode = getMode();

  const intro = {
    section: document.getElementById('introSection'),
    canvas: document.getElementById('seirCanvas'),
    summary: document.getElementById('schoolSummary'),
    uniKpis: document.getElementById('uniKpis'),
    showControlsBtn: document.getElementById('showControls')
  };

  const inter = {
    panel: document.getElementById('interactivePanel'),
    canvas: document.getElementById('seirCanvasInteractive'),
    r0: document.getElementById('rR0'), r0v: document.getElementById('rR0v'),
    inc: document.getElementById('rInc'), incv: document.getElementById('rIncv'),
    days: document.getElementById('rDays'), daysv: document.getElementById('rDaysv'),
    kAn: document.getElementById('kAnsteck'),
    kS: document.getElementById('kGesund'),
    kG: document.getElementById('kGenesene')
  };

  function startIntro(presetKey){
    const p = presets[presetKey];
    const init = { S: p.N - p.I0 - (p.E0||0), E:(p.E0||0), I:p.I0, R:0 };
    const series = runSEIR(p, init, p);

    cancelAnim?.();
    cancelAnim = animateSIR(intro.canvas, series.map(s=>({t:s.t, y:[s.y[0], s.y[2], s.y[3]]})), p.N, {
      duration: INTRO_DURATION_MS[presetKey] || 14000,
      emphasis: 'S', thin:2, thick:6, showAxes:false,
      labelLine: 'S',
      labelFormatter: ({t,S})=>`Tag ${t} · Gesund: ${Math.round(S)}`,
      onDone: ()=>{
        if (presetKey==='school_case1' && mode==='school'){ setTimeout(()=> startIntro('school_case2'), 500); }
        else { intro.showControlsBtn.hidden = false; }
      }
    });
  }

  document.querySelectorAll('[data-preset]').forEach(btn=>{
    btn.addEventListener('click', ()=>{ intro.showControlsBtn.hidden = true; startIntro(btn.dataset.preset); });
  });

  intro.showControlsBtn?.addEventListener('click', ()=>{
    intro.section.hidden = true; inter.panel.hidden = false;
    inter.r0.value="2.0"; inter.r0v.textContent="2.0";
    inter.inc.value="3";  inter.incv.textContent="3";
    inter.days.value="5"; inter.daysv.textContent="5";
    renderInteractive();
  });

  startIntro(mode==='school' ? 'school_case1' : 'uni_default');

  function renderInteractive(){
    const R0   = parseFloat(inter.r0.value);
    const incD = Math.max(2, Math.min(7, parseInt(inter.inc.value,10)));
    const dayD = Math.max(2, Math.min(5, parseInt(inter.days.value,10)));
    inter.incv.textContent = String(incD);
    inter.daysv.textContent = String(dayD);
    inter.r0v.textContent = R0.toFixed(1);

    const gamma = 1 / dayD;
    const sigma = 1 / incD;
    const beta  = R0 * gamma;

    const p = { N: N_SCHOOL, beta, gamma, sigma };
    const init = { S:N_SCHOOL-1, E:0, I:1, R:0 };
    const series = runSEIR(p, init, { autoEnd:true });

    // Canvas zeichnet S/I/R (E wird nicht gezeigt in School)
    fitCanvas(inter.canvas, 0.62);
    drawSIRChart(inter.canvas,
      series.map(s=>({t:s.t, y:[s.y[0], s.y[2], s.y[3]]})),
      p.N,
      { progress:1, emphasis:'S', thin:2, thick:6, showAxes:true }
    );

    const end = series.at(-1).y;
    inter.kAn.textContent = R0.toFixed(2);
    inter.kS.textContent  = Math.round(end[0]); // S
    inter.kG.textContent  = Math.round(end[3]); // R (Genesene)
  }

  inter.r0?.addEventListener('input', renderInteractive);
  inter.inc?.addEventListener('input', renderInteractive);
  inter.days?.addEventListener('input', renderInteractive);

  window.addEventListener('resize', ()=>{ if(!inter.panel.hidden) renderInteractive(); }, { passive:true });
}
