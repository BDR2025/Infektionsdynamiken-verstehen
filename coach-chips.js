/* ========================================================================
 * coach-chips.js — v3.3-noheader
 * OER: CC BY 4.0 · Author: B. D. Rausch · Build: 2025-09-15
 *
 * Änderungen ggü. v3.2:
 * - KEINE Auto-Injektion von Header-Chips (card-head) mehr.
 * - KEINE Auto-Injektion in #coach-right (Merke/Achtung).
 * - Coins an den Lernparametern bleiben erhalten.
 * - Coins triggern Coach-Text-Overlay (data-coach-text-open).
 * ======================================================================== */

(function(){
  'use strict';
  const W = window, D = document;
  W.IDV = W.IDV || {}; W.IDV_CTX = W.IDV_CTX || {};
  const html = D.documentElement;

  const DEF = {
    targets: { school: ['measures','gamma','gammaDays'], university: ['R0','gamma','I0'] },
    avatars: { school: 'assets/coaches/avatars/ben-small.png', university: 'assets/coaches/avatars/mila-small.png' }
  };
  const CFG = Object.assign({}, DEF, (W.IDV && W.IDV.CoachChipsConfig) || {});
  CFG.targets = Object.assign({}, DEF.targets, CFG.targets || {});
  CFG.avatars = Object.assign({}, DEF.avatars, CFG.avatars || {});

  const $ = (s, r = D) => r.querySelector(s);
  const mode = () => html.getAttribute('data-mode') || (W.IDV_CTX.meta && W.IDV_CTX.meta.mode) || 'school';
  const dict = () => (W.IDV_CTX && W.IDV_CTX.i18n && W.IDV_CTX.i18n.dict) || {};
  const get  = (o, p) => p.split('.').reduce((x,k)=>(x && k in x) ? x[k] : undefined, o);
  const once = (host, key) => { if (host.dataset[key] === '1') return true; host.dataset[key] = '1'; return false; };

  function assignCoachByKey(el, key){
    try{
      const v = D.documentElement.getAttribute('data-coach-' + key);
      if (v) el.setAttribute('data-coach', v);
    }catch{}
  }

  // --- Header-Autoinjektion entfernt (keine ensureHeaderHost / mountHeader) ---

  // Coin erzeugen: triggert jetzt auch Coach-Text-Overlay
  function coin(avatar, title, text){
    const b = D.createElement('button');
    b.className = 'coach-coin';
    b.setAttribute('data-coach-coin-open', '');   // optional, falls anderswo genutzt
    b.setAttribute('data-coach-text-open', '');   // << macht das Coach-Text-Overlay auf
    b.setAttribute('data-type', 'info');

    if (title) b.setAttribute('data-title', title);
    if (text)  b.setAttribute('data-text',  text);

    const badge = D.createElement('span');
    badge.className = 'coin-badge';
    b.appendChild(badge);
    return b;
  }

  // Coins an Lernparametern (#controls-learn) montieren
  function mountCoins(){
    const d = dict(), m = mode();
    const avatar = (CFG.avatars && CFG.avatars[m]) || DEF.avatars.school;
    const root = $('#controls-learn'); if (!root) return;

    const keys = (CFG.targets[m] || []).filter(k => root.querySelector(`[data-k="${k}"]`));
    keys.forEach(key => {
      const input = root.querySelector(`[data-k="${key}"]`);
      const card  = input && (input.closest('.ctrl, .card') || input);
      if (!card || once(card, 'coinMounted_' + key)) return;

      const head  = card.querySelector('.card-head') || card;
      const title = get(d, `controls.${key}.label`) || key;
      const text  = get(d, `controls.${key}.tip`)   || '';

      const el = coin(avatar, title, text);
      assignCoachByKey(el, key);
      head.insertBefore(el, head.firstChild);
    });
  }

  let scheduled = false;
  function mountAll(){
    if (scheduled) return; scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      try { /* kein mountHeader(); */ mountCoins(); }
      catch(e){ console.error('[coach-chips v3.3-noheader] mountAll', e); }
    });
  }

  function observe(){
    const root = $('#controls-learn'); if (!root) return;
    const obs = new MutationObserver(() => mountAll());
    obs.observe(root, { childList: true, subtree: true });
  }

  function start(){ mountAll(); observe(); }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', start, { once: true });
  W.addEventListener('idv:ready', start);
  D.addEventListener('idv:model:update', start);

  W.IDV.CoachChipsV3 = { mountAll, config: CFG };
})();
