import { runUntilSettled } from './common.js';

export function sirDeriv(params){
  const { beta, gamma, N } = params;
  return (t, [S, I, R]) => {
    const dS = -beta * S * I / N;
    const dI =  beta * S * I / N - gamma * I;
    const dR =  gamma * I;
    return [dS, dI, dR];
  };
}

export function runSIR(params, init, opts = {}){
  const deriv = sirDeriv(params);
  let series;
  if (opts.autoEnd){
    series = runUntilSettled(deriv, [init.S, init.I, init.R], { ...opts, N: params.N });
  } else {
    series = runUntilSettled(
      deriv, 
      [init.S, init.I, init.R], 
      { ...opts, N: params.N, maxDays: opts.T || 160 }
    );
  }
  return series;
}

export function statsFromSeries(series, N){
  let peakI = 0, tPeak = 0;
  for (let p of series){
    if (p.y[1] > peakI){
      peakI = p.y[1];
      tPeak = p.t;
    }
  }
  const S_end = series[series.length - 1].y[0];
  const I_end = series[series.length - 1].y[1];
  const R_end = series[series.length - 1].y[2];
  return {
    tPeak: Math.round(tPeak),
    peakI: Math.round(peakI),
    S_end: Math.round(S_end),
    I_end: Math.round(I_end),
    R_end: Math.round(R_end),
    totalInfected: Math.round(N - S_end),
    totalNotInfected: Math.round(S_end),
    duration: Math.round(series[series.length - 1].t)
  };
}
