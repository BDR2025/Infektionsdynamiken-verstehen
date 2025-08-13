import { euler } from './common.js';

// params: { beta, gamma, sigma, N }
// state:  [S, E, I, R]
export function seirDeriv({ beta, gamma, sigma, N }){
  return (t, [S,E,I,R])=>{
    const dS = -beta * S * I / N;
    const dE =  beta * S * I / N - sigma * E;
    const dI =  sigma * E - gamma * I;
    const dR =  gamma * I;
    return [dS, dE, dI, dR];
  };
}

export function runSEIR(params, init, ctrl={}) {
  // autoEnd bis stationär
  const dt = 1;
  let t = 0;
  let y = [init.S, init.E, init.I, init.R];
  const res = [{ t:0, y: y.slice() }];

  const maxDays = ctrl.maxDays ?? 365;
  const eps = 1e-4;
  for (let day=1; day<=maxDays; day++){
    const dydt = seirDeriv(params)(t, y);
    for (let i=0; i<4; i++) y[i] += dt * dydt[i];
    t += dt; res.push({ t, y: y.slice() });
    const d = res.at(-1).y.map((v,i)=> Math.abs(v - res.at(-2).y[i]));
    if (Math.max(...d) < eps && day > 30) break;
  }
  return res;
}
