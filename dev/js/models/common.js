// Euler Integrator
export function euler(f, y0, t0, t1, dt){
  const steps = Math.ceil((t1 - t0) / dt);
  const ys = [ y0.slice() ];
  let y = y0.slice(), t = t0;
  for (let k=0; k<steps; k++){
    const dydt = f(t, y);
    for (let i=0; i<y.length; i++) y[i] += dt * dydt[i];
    t += dt; 
    ys.push(y.slice());
  }
  return ys;
}

// Simulation mit Auto-Ende
export function runUntilSettled(f, y0, params={}){
  const {
    dt = 0.25,
    epsI = 1e-4 * params.N,
    epsAbs = 1e-4 * params.N,
    minDays = 60,
    maxDays = 365,
    K = 14
  } = params;

  let t = 0, stableCount = 0;
  const series = [{ t, y: y0.slice() }];
  let prev = y0.slice();

  while (t < maxDays){
    const dydt = f(t, prev);
    let next = prev.slice();
    for (let i=0; i<y0.length; i++) next[i] += dt * dydt[i];
    t += dt;
    series.push({ t, y: next.slice() });

    const dS = Math.abs(next[0] - prev[0]);
    const dI = Math.abs(next[1] - prev[1]);
    const dR = Math.abs(next[2] - prev[2]);

    if (t >= minDays){
      if (next[1] < epsI && Math.max(dS, dI, dR) < epsAbs){
        stableCount++;
      } else {
        stableCount = 0;
      }
      if (stableCount >= K) break;
    }
    prev = next;
  }
  return series;
}
