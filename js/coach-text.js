/* =====================================================================
 * Infektionsdynamiken · Coach-Text Overlay
 * File: increments/coach-text/v3/coach-text.js
 * Version: v3.1.1 · Build: 2025-09-15
 * License: CC BY 4.0 · Author: B. D. Rausch
 *
 * Changelog v3.1.1
 * - Entfernt: Fallback-Text "IDV" im Avatar-Kreis
 * - Beibeh.: Variant-Propagation (warn/summary/info/merke)
 * - Beibeh.: Platzierung .ct-box innerhalb .ct-backdrop
 * ===================================================================== */

(function () {
  'use strict';
  const W = window;
  const D = document;

  // ------------------------- helpers -------------------------
  const $  = (s, r = D) => r.querySelector(s);
  const get = (o, p) => p.split('.').reduce((x, k) => (x && k in x) ? x[k] : undefined, o);
  const dict = () =>
    (W.IDV && W.IDV.i18n && W.IDV.i18n.dict) ||
    (W.IDV_CTX && W.IDV_CTX.i18n && W.IDV_CTX.i18n.dict) || {};

  function ensureBackdrop() {
    let bd = $('.ct-backdrop');
    if (!bd) {
      bd = D.createElement('div');
      bd.className = 'ct-backdrop';
      bd.setAttribute('aria-hidden', 'true');
      D.body.appendChild(bd);
    }
    return bd;
  }

  function ensureBox(backdrop) {
    let box = backdrop.querySelector('.ct-box');
    if (!box) {
      box = D.createElement('div');
      box.className = 'ct-box';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      backdrop.appendChild(box);                 // wichtig: Box INSIDE Backdrop
    }
    return box;
  }

  function resolveVariant(trigger) {
    const dt = trigger.getAttribute('data-type');
    if (dt) return dt.trim();
    const m = /\bis-([a-z0-9_-]+)\b/i.exec(trigger.className);
    return m ? m[1] : 'info';
  }

  function getContentFromTrigger(trigger) {
    const d = dict();
    const titleKey = trigger.getAttribute('data-title-i18n');
    const textKey  = trigger.getAttribute('data-text-i18n');

    const title = titleKey ? (get(d, titleKey) ?? '') : (trigger.getAttribute('data-title') || '');
    const body  = textKey  ? (get(d, textKey)  ?? '') : (trigger.getAttribute('data-text')  || '');

    return {
      title: title || 'Kurz erklärt',
      body:  body  || 'Kein Text hinterlegt.'
    };
  }

  // ------------------------- open/close -------------------------
  function openCoach(trigger) {
    const backdrop = ensureBackdrop();
    const box = ensureBox(backdrop);

    // Variant → Accent-Farbe via CSS
    const variant = resolveVariant(trigger);
    box.className = 'ct-box ct--' + variant;

    // Content
    const { title, body } = getContentFromTrigger(trigger);

    // Render
    box.innerHTML = [
      '<div class="ct-head">',
        '<div class="ct-ava"></div>',   // <-- Kein Fallback "IDV" mehr
        `<div class="ct-title"><h3>${title}</h3></div>`,
        '<button class="ct-close" aria-label="Close">×</button>',
      '</div>',
      `<div class="ct-body">${body}</div>`,
      '<div class="ct-actions">',
        '<button class="ct-btn ct-ok" type="button">OK</button>',
      '</div>'
    ].join('');

    // Show
    backdrop.setAttribute('aria-hidden', 'false');
    D.documentElement.classList.add('ct-open');

    // Close handlers
    function close() {
      backdrop.setAttribute('aria-hidden', 'true');
      D.documentElement.classList.remove('ct-open');
    }
    box.querySelector('.ct-close').addEventListener('click', close, { once: true });
    box.querySelector('.ct-btn.ct-ok').addEventListener('click', close, { once: true });
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); }, { once: true });
    D.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); }, { once: true });

    try { box.querySelector('.ct-btn.ct-ok').focus(); } catch {}
  }

  // ------------------------- global delegate -------------------------
  D.addEventListener('click', (e) => {
    const t = e.target.closest('[data-coach-text-open]');
    if (!t) return;
    e.preventDefault();
    openCoach(t);
  });

  W.IDV = W.IDV || {};
  W.IDV.CoachText = { open: openCoach };
})();
