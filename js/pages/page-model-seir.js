// js/pages/page-model-seir.js
import { getMode } from '../core/mode.js';
import { runSEIR } from '../models/seir.js';
import { fitCanvas, drawSEIRChart, animateSEIR } from '../ui/chart.js';

const N = 100;

// Deine Schul-Presets
const presets = {
  school_case1: { N, E0: 0, I0: 1, beta: 0.33, sigma: 1/3,  gamma: 1/5,  autoEnd: true, maxDays: 200 },
  school_case2: { N, E0: 0, I0: 1, beta: 0.50, sigma: 1/10, gamma: 1/10, autoEnd: true, maxDays: 200 },
};

let cancelAnim = null;

export function init(){
  const intro = {
    section: document.getElementById('introSection'),
    canvas:  document.getElementById('seirCanvas'),
    showBtn: document.getElementById('showControls'),
    summary:  document.getElementById('schoolSummary'),
  };

  const inter = {
    panel:   document.getElementById('interactivePanel'),
    canvas:  document.getElementById('seirCanvasInteractive'),
    r0:      document.getElementById('rR0'),   r0v:   document.getElementById('rR0v'),
    inc:     document.getElementById('rInc'),  incv:  document.getElementById('rIncv'),
    days:    document.getElementById('rDays'), daysv: document.getElementById('rDaysv'),
    kAn:     document.getElementById('kAnsteck'),
    kS:      document.getElementById('kGesund'),
    kG:      document.getElementById('kGenesene'),
  };

  function playIntro(key){
    const p = presets[key];
    const init = { S: p.N - (p.E0||0) - p.I0, E: p.E0||0, I: p.I0, R: 0 };
    const series = runSEIR(p, init, p);

    cancelAnim?.();
    cancelAnim = animateSEIR(intro.canvas, series, p.N, {
      duration: key==='school_case1' ? 12000 : 14000,
      showAxes: false,
      thin: 2, thick: 4, thickE: 9,      // <— E fett!
      labelLine: 'E',
      labelFormatter: ({t,E}) => `Tag ${t} · Exponiert: ${Math.round(E)}`,
      onDone: () => {
        if (key === 'school_case1') {
          setTimeout(()=> playIntro('school_case2'), 400);
        } else {
          intro.showBtn.hidden = false;
          intro.summary.hidden = false;
        }
      }
    });
  }

  document.querySelectorAll('[data-preset]').forEach(b=>{
    b.addEventListener('click', ()=> {
      intro.showBtn.hidden = true; intro.summary.hidden = true;
      playIntro(b.dataset.preset);
    });
  });

  intro.showBtn?.addEventListener('click', ()=>{
    intro.section.hidden = true;
    inter.panel.hidden = false;

    inter.r0.value = '2.0'; inter.r0v.textContent = '2.0';
    inter.inc.value = '3';  inter.incv.textContent = '3';
    inter.days.value = '5'; inter.daysv.textContent = '5';
    renderInteractive();
  });

  // Start mit Fall 1
  playIntro('school_case1');

  function renderInteractive(){
    const R0 = parseFloat(inter.r0.value);
    const incD = Math.max(2, Math.min(7, parseInt(inter.inc.value,10)));
    const dayD = Math.max(2, Math.min(5, parseInt(inter.days.value,10)));
    inter.r0v.textContent = R0.toFixed(1);
    inter.incv.textContent = String(incD);
    inter.daysv.textContent = String(dayD);

    const gamma = 1 / dayD;
    const sigma = 1 / incD;
    const beta  = R0 * gamma;

    const p = { N, beta, sigma, gamma, autoEnd:true };
    const init = { S: N-1, E: 0, I: 1, R: 0 };
    const series = runSEIR(p, init, p);

    fitCanvas(inter.canvas, 0.62);
    drawSEIRChart(inter.canvas, series, p.N, {
      progress: 1, showAxes: true,
      thin: 2, thick: 4, thickE: 9      // <— E auch hier fett
    });

    const end = series.at(-1).y; // [S,E,I,R]
    inter.kAn.textContent = R0.toFixed(2);
    inter.kS.textContent  = Math.round(end[0]); // S_end
    inter.kG.textContent  = Math.round(end[3]); // R_end
  }

  inter.r0?.addEventListener('input', renderInteractive);
  inter.inc?.addEventListener('input', renderInteractive);
  inter.days?.addEventListener('input', renderInteractive);

  window.addEventListener('resize', ()=>{
    if (!intro.section.hidden) fitCanvas(intro.canvas, 0.62);
    if (!inter.panel.hidden)  renderInteractive();
  }, { passive:true });
}
