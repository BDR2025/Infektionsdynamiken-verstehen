/*! =======================================================================
 * Infection Dynamics · Parameter-Tool
 * Version: v2.3.0 · Build: 2025-09-19 · License: CC BY 4.0
 * Author: Nic + ChatGPT · infectiondynamics.eu
 *
 * Neu (additiv):
 * - Formel-Ansicht: Zahlen IN der Bruchschreibweise (Zähler/Nenner/Malpunkt).
 * - Gezielt nur den betroffenen Zahlen-Teil pulsen (Zähler/Nenner/Mulitplikand).
 * - Snap-Scaling + Anker am Bruchzentrum (ruhiges Rendering).
 * - Formel-Karten einspaltig (auch Desktop).
 * - Rest (Algebra/Events/KPI/Controls) unverändert.
 * =======================================================================*/
(function () {
  const VERSION = "2.3.0";

  // -------- helpers -----------------------------------------------------
  const qs  = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const ce  = (tag, cls) => { const el = document.createElement(tag); if (cls) el.className = cls; return el; };
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const isNum = (v) => typeof v === "number" && Number.isFinite(v);

  // EPS tolerance to avoid rounding ping-pong in algebraic constraints
  const EPS = 1e-9;
  const nearlyEqual = (a, b, eps = EPS) => Math.abs(a - b) < eps;

  const DICT = {
    en: {
      learning: "Learning parameters",
      model: "Model parameters",
      sim: "Simulation parameters",
      kpis: "Key KPIs",
      viewControls: "Controls view",
      viewFormula: "Formula view",
      formula: "Formula view"
    },
    de: {
      learning: "Lernzielparameter",
      model: "Modellparameter",
      sim: "Simulationsparameter",
      kpis: "Key KPIs",
      viewControls: "Regler-Ansicht",
      viewFormula: "Formel-Ansicht",
      formula: "Formel-Ansicht"
    }
  };

  const KPI_LABELS = {
    de: { R0: "R₀", Reff0: "Rₑff(0)", HIT: "Herdenschutz-Schwelle", T2: "Verdopplungszeit T₂", N: "N" },
    en: { R0: "R₀", Reff0: "Rₑff(0)", HIT: "Herd immunity threshold", T2: "Doubling time T₂", N: "N" }
  };

  const COUPLINGS = {
    SIR:  ["D","gamma","beta","R0"],
    SEIR: ["D","gamma","beta","R0","L","sigma"] // später feinjustieren
  };

  const CATALOG = {
    SIR: {
      params: {
        beta:  { label:{de:"β (Infektionsrate)", en:"β (infection rate)"}, min:0.05, max:1.5, step:0.01, unit:"/d",  group:"model" },
        D:     { label:{de:"D (Dauer)",          en:"D (duration)"},       min:1,    max:21,  step:0.1,  unit:"days",group:"learning" },
        gamma: { label:{de:"γ (Genesungsrate)",  en:"γ (recovery rate)"},  min:0.02, max:1.0, step:0.01, unit:"/d",  group:"model" },
        R0:    { label:{de:"R₀",                 en:"R₀"},                 min:0.5,  max:20,  step:0.01, unit:"",    group:"model" },
        measures:{label:{de:"Maßnahmen", en:"Measures"}, min:0, max:1, step:0.01, unit:"%", group:"learning" },
        N:     { label:{de:"Population N", en:"Population N"}, min:1e5, max:1e8, step:1e5, group:"sim" },
        I0:    { label:{de:"Indexfälle I₀", en:"Index cases I₀"}, min:1, max:5e4, step:1, group:"sim" },
        T:     { label:{de:"Dauer T", en:"Duration T"}, min:30, max:365, step:1, unit:"days", group:"sim" },
        dt:    { label:{de:"Zeitschritt Δt", en:"Time step Δt"}, min:0.25, max:2, step:0.25, group:"sim" }
      },
      kpis: ["R0","Reff0","HIT","T2","N"]
    },
    SEIR: {
      params: {
        beta:{label:{de:"β", en:"β"}, min:0.05, max:1.5, step:0.01, group:"model"},
        D:{label:{de:"D (Dauer)", en:"D (duration)"}, min:1, max:21, step:0.1, group:"learning"},
        L:{label:{de:"L (Latenz)", en:"L (latency)"}, min:1, max:14, step:0.5, group:"learning"},
        gamma:{label:{de:"γ", en:"γ"}, min:0.02, max:1.0, step:0.01, group:"model"},
        sigma:{label:{de:"σ", en:"σ"}, min:0.07, max:1.0, step:0.01, group:"model"},
        R0:{label:{de:"R₀", en:"R₀"}, min:0.5, max:20, step:0.01, group:"model"},
        N:{label:{de:"Population N", en:"Population N"}, min:1e5, max:1e8, step:1e5, group:"sim"},
        I0:{label:{de:"Indexfälle I₀", en:"Index cases I₀"}, min:1, max:5e4, step:1, group:"sim"},
        T:{label:{de:"Dauer T", en:"Duration T"}, min:30, max:365, step:1, unit:"days", group:"sim"},
        dt:{label:{de:"Zeitschritt Δt", en:"Time step Δt"}, min:0.25, max:2, step:0.25, group:"sim"}
      },
      kpis: ["R0","Reff0","N"]
    }
  };

  const DEFAULTS = {
    meta:   { lang:"de", mode:"school", model:"SIR", minilabId:null, view:"controls" },
    params: { beta:0.30, D:10, gamma:0.10, R0:3.0, measures:0.0, N:1_000_000, I0:1, T:120, dt:0.5, L:null, sigma:null },
    derived:{ R0:3.0, Reff0:3.0, S0:999_999, gammaFromD:0.10 }
  };

  let STATE  = JSON.parse(JSON.stringify(DEFAULTS));
  let CONFIG = null;
  let TARGET = null;

  // guards
  let __rafPending = false;
  let __dragActive = null;
  let __isApplying = false;

  // Formel-Ansicht pulse & timing
  const PULSE_MS = 600;
  const __pulseTimers = Object.create(null);

  // -------- formatting & parsing ----------------------------------------
  const fmt = {
    nf: null,
    setLocale(lang){ this.nf = new Intl.NumberFormat(lang === "de" ? "de-DE" : "en-US"); },
    numToStr(v){ return isNum(v) ? this.nf.format(v) : ""; }
  };
  function parseLocaleNumber(str, lang){
    if (typeof str !== "string") return NaN;
    let s = str.trim();
    if (lang === "de") s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }

  function decimalsFor(key){
    const mode = (STATE.meta.mode||"school").toLowerCase();
    const map = {
      school:     { measures:2, D:2, beta:2, gamma:2, R0:2, dt:2, N:0, I0:0, T:0, L:2, sigma:3 },
      university: { measures:2, D:2, beta:4, gamma:4, R0:3, dt:2, N:0, I0:0, T:0, L:2, sigma:3 }
    };
    const d = (map[mode] && map[mode][key] != null) ? map[mode][key] : 2;
    return d;
  }
  function formatInputValue(key, v){
    const dec = decimalsFor(key);
    if (!Number.isFinite(v)) return "";
    const rounded = Number(v).toFixed(dec);
    return new Intl.NumberFormat(STATE.meta.lang === "de" ? "de-DE" : "en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(Number(rounded));
  }

  // -------- events -------------------------------------------------------
  function emit(name, detail){ document.dispatchEvent(new CustomEvent(name, { bubbles:true, detail })); }

  function enrichedState() {
    const st = getState();
    const p  = st.params;

    const gamma = isNum(p.gamma) ? p.gamma
                : (isNum(p.D) && p.D > 0 ? 1 / p.D : undefined);

    const beta  = isNum(p.beta) ? p.beta
                : (isNum(p.R0) && isNum(gamma) ? p.R0 * gamma : undefined);

    const R0    = isNum(p.R0) ? p.R0
                : (isNum(beta) && isNum(gamma) && gamma > 0 ? beta / gamma : undefined);

    const sigma = isNum(p.sigma) ? p.sigma
                : (isNum(p.L) && p.L > 0 ? 1 / p.L : undefined);

    st.params = { ...p, beta, gamma, R0, ...(sigma !== undefined ? { sigma } : {}) };
    return st;
  }

  function emitReady(){ emit("idv:params:ready", enrichedState()); }
  function emitChange(key, oldValue, newValue){
    emit("idv:param:change", { cause:`user:drag:${key}`, key, oldValue, newValue, state:getState() });
  }
  function emitUpdate(cause){
    const st = enrichedState();
    emit("idv:params:update", { cause, state: st, params: st.params, meta: st.meta });
  }

  // -------- math/derived -------------------------------------------------
  function recalcDerived() {
    const p = STATE.params;

    if (isNum(p.D) && p.D > 0) STATE.derived.gammaFromD = +(1 / p.D).toFixed(4);

    const hasBG = isNum(p.beta) && isNum(p.gamma) && p.gamma > 0;
    STATE.derived.R0 = hasBG ? +(p.beta / p.gamma).toFixed(3) : (isNum(p.R0) ? +(+p.R0).toFixed(3) : 0);

    STATE.params.R0 = STATE.derived.R0;

    STATE.derived.S0 = Math.max(0, (p.N ?? 0) - (p.I0 ?? 0));

    const m = clamp(p.measures ?? 0, 0, 1);
    const includeSratio = (STATE.meta.mode === 'university');
    const sRatio = includeSratio && (p.N>0) ? (STATE.derived.S0 / p.N) : 1;
    const R0base = STATE.derived.R0 || 0;
    STATE.derived.Reff0 = +(R0base * (1 - m) * sRatio).toFixed(3);
  }

  function applyConstraints(changedKey){
    const p = STATE.params;
    const model = STATE.meta.model;

    if (model==="SIR" || model==="SEIR") {
      if (changedKey === "D") {
        if (isNum(p.D) && p.D > 0) {
          const newGamma = 1 / p.D;
          if (!nearlyEqual(p.gamma, newGamma)) p.gamma = newGamma;
        }
      } else if (changedKey === "gamma") {
        if (isNum(p.gamma) && p.gamma > 0) {
          const newD = 1 / p.gamma;
          if (!nearlyEqual(p.D, newD)) p.D = newD;
        }
      } else if (changedKey === "R0") {
        if (isNum(p.R0) && isNum(p.gamma)) {
          const newBeta = p.R0 * p.gamma;
          if (!nearlyEqual(p.beta, newBeta)) p.beta = newBeta;
        }
      }
      // 'beta' change → R0 derived
    }

    if (model==="SEIR") {
      if (changedKey === "L" && isNum(p.L) && p.L > 0) {
        const newSigma = 1 / p.L;
        if (!nearlyEqual(p.sigma, newSigma)) p.sigma = newSigma;
      } else if (changedKey === "sigma" && isNum(p.sigma) && p.sigma > 0) {
        const newL = 1 / p.sigma;
        if (!nearlyEqual(p.L, newL)) p.L = newL;
      }
    }
  }

  // -------- UI sync ------------------------------------------------------
  function syncControl(key){
    const val = STATE.params[key];
    const slider = qs(`#pt-${key}`, TARGET);
    const direct = qs(`#pt-${key}-n`, TARGET);
    if (slider && isNum(val)) slider.value = (key==="measures") ? (val*100) : val;
    if (direct) {
      const dv = (key==="measures") ? (val*100) : val;
      direct.value = isNum(dv) ? formatInputValue(key, dv) : "";
    }
  }
  function syncAllControls(){ Object.keys(STATE.params).forEach(syncControl); }

  function section(titleKey){
    const wrap = ce("section", "pt-section");
    const h = ce("h3", "pt-section-title");
    h.textContent = DICT[STATE.meta.lang]?.[titleKey] || titleKey;
    const body = ce("div", "pt-section-body");
    wrap.appendChild(h); wrap.appendChild(body);
    return { wrap, body };
  }

  function renderControl(key, def){
    const lang = STATE.meta.lang;
    const row = ce("div", "pt-row");
    const label = ce("label", "pt-label");
    label.textContent = def.label?.[lang] || key;
    label.setAttribute("for", `pt-${key}`);
    const inputWrap = ce("div", "pt-input");

    const slider = ce("input");
    slider.type = "range"; slider.id = `pt-${key}`;
    const isMeasures = (key === "measures");
    slider.min = isMeasures ? 0 : (def.min ?? 0);
    slider.max = isMeasures ? 100 : (def.max ?? 1);
    slider.step = isMeasures ? 1 : (def.step ?? 0.01);
    const sv = STATE.params[key];
    slider.value = isMeasures ? (sv*100) : (isNum(sv) ? sv : (isMeasures ? 0 : def.min ?? 0));

    const direct = ce("input");
    direct.type = "text";
    direct.className = "pt-number";
    direct.id = `pt-${key}-n`;
    const dv = isMeasures ? (STATE.params[key]*100) : STATE.params[key];
    direct.value = isNum(dv) ? formatInputValue(key, dv) : "";
    if (STATE.meta.mode === "school") { direct.disabled = true; direct.classList.add("pt-disabled"); }

    inputWrap.appendChild(slider); inputWrap.appendChild(direct);

    const unit = ce("span", "pt-unit");
    if (def.unit === "%") unit.textContent = "%";
    else if (def.unit === "days") unit.textContent = (STATE.meta.lang === "de" ? "Tage" : "days");
    else if (def.unit === "/d") unit.textContent = "/d";

    slider.addEventListener("input", () => updateValueFromSlider(key, def, slider.value));
    direct.addEventListener("change", () => updateValueFromDirect(key, def, direct.value));

    const endDrag = () => {
      if (__dragActive === key) {
        __dragActive = null;
        emitUpdate(`user:dragend:${key}`);
      }
    };
    slider.addEventListener("pointerdown", () => { __dragActive = key; });
    slider.addEventListener("pointerup", endDrag);
    slider.addEventListener("pointercancel", endDrag);
    slider.addEventListener("mouseleave", endDrag);
    slider.addEventListener("mouseup", endDrag);
    slider.addEventListener("touchend", endDrag);

    row.appendChild(label); row.appendChild(inputWrap); row.appendChild(unit);
    return row;
  }

  function addControlsByGroup(container, group){
    const cat = CATALOG[STATE.meta.model]; if (!cat) return;
    Object.entries(cat.params).forEach(([key, def]) => {
      if (def.group === group) container.appendChild(renderControl(key, def));
    });
  }
  function addControlsByKeys(container, keys){
    const cat = CATALOG[STATE.meta.model]; if (!cat || !Array.isArray(keys)) return;
    keys.forEach(key => {
      const def = cat.params[key];
      if (def) container.appendChild(renderControl(key, def));
    });
  }

  // KPIs ------------------------------------------------------------------
  function renderKPIs(container){
    const kpiTitle = ce("h3", "pt-section-title");
    kpiTitle.textContent = DICT[STATE.meta.lang]?.kpis || "KPIs";
    container.appendChild(kpiTitle);

    const kpiWrap = ce("div", "pt-kpis");
    const modelKeys = (CATALOG[STATE.meta.model]?.kpis) || ["R0","Reff0","N"];
    const cfgKeys = (CONFIG?.kpis);
    const keys = Array.isArray(cfgKeys) ? cfgKeys : modelKeys;

    const lang = STATE.meta.lang;
    keys.forEach(k => {
      const card = ce("div", "pt-kpi");
      const title = ce("div", "pt-kpi-title");
      title.textContent = (KPI_LABELS?.[lang]?.[k]) || k;
      const val = ce("div", "pt-kpi-value"); val.dataset.key = k;
      card.appendChild(title); card.appendChild(val); kpiWrap.appendChild(card);
    });
    container.appendChild(kpiWrap);

    updateKPIValues();
  }

  function updateKPIValues(){
    const R0 = STATE.derived.R0;
    const gamma = STATE.params.gamma;
    const wrap = document.querySelector(".pt-kpis");
    if (!wrap) return;

    const base = { R0, Reff0: STATE.derived.Reff0, N: STATE.params.N };

    let hitText = "—";
    if (Number.isFinite(R0) && R0 > 1) {
      const hit = (1 - 1 / R0) * 100;
      hitText = new Intl.NumberFormat(STATE.meta.lang === "de" ? "de-DE" : "en-US",
              { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(hit) + " %";
    }

    let t2Text = "—";
    if (Number.isFinite(gamma) && Number.isFinite(R0)) {
      const r0 = gamma * (R0 - 1);
      if (r0 > 0) {
        const T2 = Math.log(2) / r0;
        t2Text = new Intl.NumberFormat(STATE.meta.lang === "de" ? "de-DE" : "en-US",
                { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(T2) + " d";
      }
    }

    wrap.querySelectorAll(".pt-kpi-value").forEach(el => {
      const k = el.dataset.key;
      if (k === "HIT") { el.textContent = hitText; return; }
      if (k === "T2")  { el.textContent = t2Text;  return; }
      const v = base[k];
      if (typeof v === "number" && Number.isFinite(v)) el.textContent = fmt.numToStr(v);
      else if (v != null) el.textContent = String(v);
      else el.textContent = "—";
    });
  }

  // -------- Formel-Ansicht: Utilities -----------------------------------
  function pulseNumPart(varName, root){
    const host = root || TARGET;
    const nodes = qsa(`.pt-eq-row .nums .pt-num--${varName}`, host);
    nodes.forEach(el => {
      el.classList.remove("pulsed"); // restart
      // reflow
      void el.offsetWidth;
      el.classList.add("pulsed");
      const id = `${varName}-${Math.random()}`;
      __pulseTimers[id] = setTimeout(()=> el.classList.remove("pulsed"), PULSE_MS);
    });
  }

  function anchorEqToFracCenter(eqEl){
    if (!eqEl) return;
    const frac = eqEl.querySelector(".nums mjx-mfrac, .nums mjx-frac");
    const rEq  = eqEl.getBoundingClientRect();
    let ox = rEq.width * 0.5, oy = rEq.height * 0.5;
    if (frac){
      const rf = frac.getBoundingClientRect();
      ox = (rf.left + rf.right)/2 - rEq.left;
      oy = (rf.top  + rf.bottom)/2 - rEq.top;
    }
    eqEl.style.transformOrigin = `${ox}px ${oy}px`;
  }

  function fitEqToRow(eqEl){
    if (!eqEl) return;
    // erst Anker setzen, dann messen
    anchorEqToFracCenter(eqEl);
    const parent = eqEl.parentElement; if (!parent) return;
    const pw = parent.clientWidth || 1;
    eqEl.style.transform = "scale(1)";
    const ww = eqEl.scrollWidth || eqEl.getBoundingClientRect().width || 1;
    let scale = Math.min(1, pw / ww);
    const steps = 32; // Snap-Stufen
    scale = Math.round(scale * steps) / steps;
    eqEl.style.transform = `scale(${scale})`;
  }

  const units = () => ({
    days: (STATE.meta.lang === "de" ? "Tage" : "days"),
    perDay: "/d"
  });
  function nfFor(dec){ return new Intl.NumberFormat(STATE.meta.lang === "de" ? "de-DE" : "en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  function dval(key){ return STATE.params[key]; }
  function ddec(key){ return decimalsFor(key); }

  // Symbol-TeX (statisch, einmal typesetten)
  function symbolTexFor(key){
    switch(key){
      case "D":     return "D = \\frac{1}{\\gamma}";
      case "gamma": return "\\gamma = \\frac{\\beta}{R_0}";
      case "beta":  return "\\beta = R_0 \\cdot \\gamma";
      case "R0":    return "R_0 = \\frac{\\beta}{\\gamma}";
      default:      return key;
    }
  }

  // Zahlen-TeX (IN der Bruch-/Produkt-Schreibweise; nutzt \class … für gezieltes Highlight)
  function numbersTexFor(key){
    const U  = units();
    const nfD = nfFor(ddec("D"));
    const nfG = nfFor(ddec("gamma"));
    const nfB = nfFor(ddec("beta"));
    const nfR = nfFor(ddec("R0"));

    if (key === "D"){
      // D = 1/γ = 1 / γ_live = D_live Tage
      const g = nfG.format(dval("gamma"));
      const Dl = nfD.format(dval("D"));
      return String.raw`
        \;=\; \frac{ \class{pt-num pt-num--one}{1} }{ \class{pt-num pt-num--gamma}{${g}} }
        \;=\; ${Dl}\ \text{${U.days}}
      `;
    }
    if (key === "gamma"){
      // γ = β/R0 = (β_live)/(R0_live) = γ_live /d
      const b = nfB.format(dval("beta"));
      const r = nfR.format(dval("R0"));
      const gl= nfG.format(dval("gamma"));
      return String.raw`
        \;=\; \frac{ \class{pt-num pt-num--beta}{${b}} }{ \class{pt-num pt-num--R0}{${r}} }
        \;=\; ${gl}\ \text{${U.perDay}}
      `;
    }
    if (key === "beta"){
      // β = R0·γ = (R0_live)·(γ_live) = β_live /d
      const r = nfR.format(dval("R0"));
      const g = nfG.format(dval("gamma"));
      const bl= nfB.format(dval("beta"));
      return String.raw`
        \;=\; \class{pt-num pt-num--R0}{${r}} \cdot \class{pt-num pt-num--gamma}{${g}}
        \;=\; ${bl}\ \text{${U.perDay}}
      `;
    }
    if (key === "R0"){
      // R0 = β/γ = (β_live)/(γ_live) = R0_live
      const b = nfB.format(dval("beta"));
      const g = nfG.format(dval("gamma"));
      const rl= nfR.format(dval("R0"));
      return String.raw`
        \;=\; \frac{ \class{pt-num pt-num--beta}{${b}} }{ \class{pt-num pt-num--gamma}{${g}} }
        \;=\; ${rl}
      `;
    }
    return "";
  }

  function typesetPartsAndFit(root){
    const nodes = qsa(".pt-eq .sym, .pt-eq .nums", root);
    const MJ = (window.MathJax && (window.MathJax.typesetPromise || window.MathJax.typeset));
    if (nodes.length === 0) return;

    // typeset nur die Teile, danach alle eq fitten
    const finish = () => { qsa(".pt-eq", root).forEach(fitEqToRow); };

    if (MJ && window.MathJax.typesetPromise){
      window.MathJax.typesetPromise(nodes).then(finish).catch(finish);
    } else if (MJ && window.MathJax.typeset) {
      window.MathJax.typeset(nodes);
      finish();
    } else {
      // Fallback ohne MathJax: naive Umsetzungen & fit
      nodes.forEach(n=>{
        n.innerHTML = n.innerHTML
          .replaceAll("\\frac","/")
          .replaceAll("\\cdot","·")
          .replaceAll("_0","₀")
          .replaceAll("\\gamma","γ")
          .replaceAll("\\beta","β")
          .replaceAll("R_0","R₀");
      });
      finish();
    }
  }

  function updateNumbersAndFitAll(){
    if (STATE.meta.view !== "formula") return;
    (COUPLINGS[STATE.meta.model] || []).forEach(key=>{
      const row  = qs(`.pt-eq-row[data-key="${key}"]`, TARGET);
      if (!row) return;
      const eq   = qs(".pt-eq", row);
      const nums = qs(".nums", eq);
      if (nums) { nums.innerHTML = `\\(${numbersTexFor(key)}\\)`; }
    });
    typesetPartsAndFit(TARGET);
  }

  // -------- Toolbar (Ansicht-Umschalter) --------------------------------
  function buildToolbar(container){
    const bar = ce("div", "pt-toolbar");
    const lang = STATE.meta.lang;
    const btnControls = ce("button", "pt-ctrl");
    btnControls.type = "button";
    btnControls.textContent = DICT[lang]?.viewControls || "Controls view";
    btnControls.setAttribute("aria-pressed", STATE.meta.view === "controls" ? "true" : "false");

    const btnFormula = ce("button", "pt-ctrl");
    btnFormula.type = "button";
    btnFormula.textContent = DICT[lang]?.viewFormula || "Formula view";
    btnFormula.setAttribute("aria-pressed", STATE.meta.view === "formula" ? "true" : "false");

    btnControls.addEventListener("click", () => {
      if (STATE.meta.view === "controls") return;
      STATE.meta.view = "controls";
      render(); syncAllControls();
    });
    btnFormula.addEventListener("click", () => {
      if (STATE.meta.view === "formula") return;
      STATE.meta.view = "formula";
      render(); syncAllControls();
    });

    bar.appendChild(btnControls);
    bar.appendChild(btnFormula);
    container.appendChild(bar);
  }

  // -------- Standard-Ansicht --------------------------------------------
  function renderControlsView(){
    const secL = section("learning");
    addControlsByGroup(secL.body, "learning");
    TARGET.appendChild(secL.wrap);

    if (STATE.meta.mode !== "school") {
      const secM = section("model");
      addControlsByGroup(secM.body, "model");
      TARGET.appendChild(secM.wrap);
    }

    const secS = section("sim");
    addControlsByGroup(secS.body, "sim");
    TARGET.appendChild(secS.wrap);

    renderKPIs(TARGET);
  }

  // -------- Formel-Ansicht: Karten --------------------------------------
  function buildFormulaCard(key, def){
    const lang = STATE.meta.lang;
    const card = ce("div", "pt-form-card"); card.dataset.key = key;

    const title = ce("div", "pt-form-title");
    title.textContent = def.label?.[lang] || key;
    card.appendChild(title);

    const eqRow = ce("div", "pt-eq-row"); eqRow.dataset.key = key;
    const eq    = ce("div", "pt-eq");

    const sym = ce("span", "sym");
    sym.innerHTML = `\\(${symbolTexFor(key)}\\)`;
    const nums = ce("span", "nums");
    nums.innerHTML = `\\(${numbersTexFor(key)}\\)`;
    eq.appendChild(sym); eq.appendChild(nums);
    eqRow.appendChild(eq);
    card.appendChild(eqRow);

    const ctrl = ce("div", "pt-form-ctrl");
    const slider = ce("input"); slider.type="range"; slider.id = `pt-${key}`;
    slider.min = def.min ?? 0; slider.max = def.max ?? 1; slider.step = def.step ?? 0.01;
    slider.value = isNum(STATE.params[key]) ? STATE.params[key] : (def.min ?? 0);
    const unit = ce("span", "pt-form-unit");
    if (def.unit === "/d") unit.textContent = "/d";
    else if (def.unit === "days") unit.textContent = (lang === "de" ? "Tage" : "days");
    else unit.textContent = def.unit || "";

    ctrl.appendChild(slider); ctrl.appendChild(unit);
    card.appendChild(ctrl);

    // Events (wie Standard, ohne Direct Input)
    const endDrag = () => {
      if (__dragActive === key) {
        __dragActive = null;
        emitUpdate(`user:dragend:${key}`);
      }
    };
    slider.addEventListener("pointerdown", () => { __dragActive = key; });
    slider.addEventListener("pointerup", endDrag);
    slider.addEventListener("pointercancel", endDrag);
    slider.addEventListener("mouseleave", endDrag);
    slider.addEventListener("mouseup", endDrag);
    slider.addEventListener("touchend", endDrag);
    slider.addEventListener("input", () => updateValueFromSlider(key, def, slider.value));

    return card;
  }

  function renderFormulaView(){
    const keys = COUPLINGS[STATE.meta.model] || [];
    const secF = section("formula");

    const grid = ce("div", "pt-form-grid"); // immer 1 Spalte (auch Desktop)
    const cat  = CATALOG[STATE.meta.model];

    keys.forEach(key=>{
      const def = cat?.params?.[key];
      if (!def) return;
      grid.appendChild(buildFormulaCard(key, def));
    });
    secF.body.appendChild(grid);
    TARGET.appendChild(secF.wrap);

    // Symbol & Zahlen typesetten, dann fitten
    typesetPartsAndFit(secF.body);

    // KPIs auch in der Formel-Ansicht
    renderKPIs(TARGET);

    // Resize: neu fitten
    window.addEventListener("resize", ()=>{
      qsa(".pt-eq", TARGET).forEach(fitEqToRow);
    }, { passive:true });
  }

  function render(){
    TARGET.innerHTML = "";
    buildToolbar(TARGET);
    if (STATE.meta.view === "formula") renderFormulaView();
    else renderControlsView();
  }

  // -------- updates from UI ---------------------------------------------
  function updateValueFromSlider(key, def, raw){
    if (!__dragActive) __dragActive = key;

    // Snapshot vor Apply (Delta-Erkennung)
    const prev = { D: STATE.params.D, gamma: STATE.params.gamma, beta: STATE.params.beta, R0: STATE.params.R0 };

    let v = Number(raw);
    const old = STATE.params[key];
    if (key === "measures") v = v/100;
    STATE.params[key] = clamp(v, def.min ?? 0, def.max ?? 1);

    if (!__rafPending) {
      __rafPending = true;
      requestAnimationFrame(() => {
        __rafPending = false;
        __isApplying = true;

        applyConstraints(key);
        recalcDerived();
        syncAllControls();
        updateKPIValues();

        if (STATE.meta.view === "formula") {
          // Zahlen IN der Bruchschreibweise neu setzen + fit
          updateNumbersAndFitAll();

          // gezielt die veränderten Fremdgrößen-Teile pulsen
          const vars = ["D","gamma","beta","R0"];
          vars.forEach(vk=>{
            if (vk === key) return; // eigener Regler: nicht als "fremd" markieren
            const before = prev[vk], after = STATE.params[vk];
            if (Number.isFinite(before) && Number.isFinite(after) && Math.abs(before - after) > 1e-6){
              // pulse ALLE Stellen, an denen diese Variable in den Zahlen erscheint
              pulseNumPart(vk, TARGET);
            }
          });
        }

        __isApplying = false;
        emitChange(key, old, STATE.params[key]);
      });
    }
  }

  function updateValueFromDirect(key, def, raw){
    const parsed = parseLocaleNumber(raw, STATE.meta.lang);
    if (!isNum(parsed)) return;
    const old = STATE.params[key];
    let v = parsed; if (key === "measures") v = v/100;
    STATE.params[key] = clamp(v, def.min ?? 0, def.max ?? 1);

    __isApplying = true;
    applyConstraints(key);
    recalcDerived();
    syncAllControls();
    updateKPIValues();

    if (STATE.meta.view === "formula") updateNumbersAndFitAll();

    __isApplying = false;

    emitChange(key, old, STATE.params[key]);
    emitUpdate(`user:change:${key}`);
  }

  // -------- meta/config/init --------------------------------------------
  function readMeta(){
    const html = document.documentElement;
    STATE.meta.lang  = (html.getAttribute("lang") || "de").toLowerCase();
    STATE.meta.mode  = (html.getAttribute("data-mode") || "school").toLowerCase();
    STATE.meta.model = (html.getAttribute("data-model") || "SIR").toUpperCase();
    STATE.meta.minilabId = html.getAttribute("data-minilab-id");
  }
  function readConfig(){
    try {
      const cfgEl = qs("#parameter-tool-config");
      CONFIG = cfgEl ? JSON.parse(cfgEl.textContent) : null;
    } catch(e){ CONFIG = null; }
  }
  function initDefaultsForModel(){
    const p = STATE.params;
    if (isNum(p.D) && p.D>0) p.gamma = 1/p.D;
    if (isNum(p.beta) && isNum(p.gamma) && p.gamma>0) p.R0 = p.beta/p.gamma;
    recalcDerived();
  }

  // --- Accordion-Enhancer (bestehend) -----------------------------------
  function enhanceAccordion(root){
    const host = root || TARGET;
    if (!host) return;

    host.querySelectorAll(".pt-section").forEach((sec, idx) => {
      if (sec.dataset.enhanced === "true") return;

      const titleEl = sec.querySelector(".pt-section-title");
      const bodyEl  = sec.querySelector(".pt-section-body");
      if (!titleEl || !bodyEl) return;

      const btn = ce("button", "pt-section-head");
      btn.type = "button";
      btn.setAttribute("aria-expanded", idx === 0 ? "true" : "false");

      const caret = ce("span", "pt-section-caret"); caret.setAttribute("aria-hidden", "true");
      const label = ce("span", "pt-section-head-label");
      label.textContent = titleEl.textContent;

      btn.appendChild(label);
      btn.appendChild(caret);
      sec.replaceChild(btn, titleEl);

      if (idx === 0) { sec.classList.add("is-open"); bodyEl.hidden = false; }
      else { sec.classList.remove("is-open"); bodyEl.hidden = true; }

      btn.addEventListener("click", () => {
        const open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", open ? "false" : "true");
        sec.classList.toggle("is-open", !open);
        bodyEl.hidden = open;
      });

      sec.dataset.enhanced = "true";
    });
  }

  let __ptObserver = null;
  function ensureObserver(){
    if (__ptObserver || !TARGET) return;
    __ptObserver = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length) {
          enhanceAccordion(TARGET);
          break;
        }
      }
    });
    __ptObserver.observe(TARGET, { childList: true, subtree: true });
  }

  function mount(opts = {}){
    TARGET = opts.target ? qs(opts.target) : qs("#parameter-tool");
    if (!TARGET) { console.warn("[Parameter-Tool] No target container found."); return; }
    TARGET.classList.add("pt");

    readMeta(); readConfig(); fmt.setLocale(STATE.meta.lang); initDefaultsForModel();

    const viewFlag = (TARGET.dataset?.ptView || "").toLowerCase();
    const formulaFlag = (TARGET.dataset?.ptFormula || "").toLowerCase();
    if (viewFlag === "formula" || formulaFlag === "true" || formulaFlag === "1") {
      STATE.meta.view = "formula";
    }

    render(); syncAllControls();
    enhanceAccordion(TARGET);
    ensureObserver();

    console.log(`[Parameter-Tool] v${VERSION} mounted · lang=${STATE.meta.lang} · mode=${STATE.meta.mode} · model=${STATE.meta.model} · view=${STATE.meta.view}`);
    emitReady();
  }

  // -------- public API ---------------------------------------------------
  function getState(){ return JSON.parse(JSON.stringify(STATE)); }
  function set(partial){
    if (__isApplying) return;
    if (!partial) return;

    if (typeof partial === "string") {
      STATE.meta.model = partial.toUpperCase();
      initDefaultsForModel();
      render(); syncAllControls();
      emitUpdate("model-switch");
      return;
    }

    Object.assign(STATE.params, partial.params || {});
    Object.assign(STATE.meta, partial.meta || {});
    __isApplying = true;
    applyConstraints("programmatic");
    recalcDerived();
    render(); syncAllControls();
    __isApplying = false;
    emitUpdate("programmatic");
  }
  function on(name, handler){ document.addEventListener(name, handler); }

  // expose
  window.ParameterTool = { version: VERSION, mount, getState, set, on };
})();
