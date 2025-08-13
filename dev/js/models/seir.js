// js/models/seir.js
import { runUntilSettled } from './common.js';

/** Ableitungen für SEIR:
 *  S' = -β S I / N
 *  E' =  β S I / N - σ E
 *  I' =  σ E - γ I
 *  R' =  γ I
 */
export function seirDeriv(params){
  const { beta, sigma, gamma, N } = params; // σ=1/IncubationDays, γ=1/InfectiousDays
  return (t, [S, E, I, R]) => {
    const inf = beta * S * I / N;
    const dS = -inf;
    const dE =  inf - sigma * E;
    const dI =  sigma * E - gamma * I;
    const dR =  gamma * I;
    return [dS, dE, dI, dR];
  };
}

/** Läuft automatisch bis „settled“ (kleine Änderungen) oder bis maxDays. */
export function runSEIR(params, init, opts = {}){
  const deriv = seirDeriv(params);
  const y0 = [init.S, init.E, init.I, init.R];
  const series = runUntilSettled(deriv, y0, { ...opts, N: params.N });
  return series; // [{t, y:[S,E,I,R]}]
}
