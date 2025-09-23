/*!
 * Coach Video Overlay — Landing minimal (NO native controls; audio-on-click)
 * Project: Infektionsdynamiken (Landing Page)
 * Author: B. D. Rausch
 * License: CC BY 4.0
 * Version: 1.4.1 (2025-09-23) — Auto-close on ended; Audio startet auf Klick; Fallback: muted
 *
 * Erwartetes Markup:
 * <div class="coach-backdrop" aria-hidden="true"></div>
 * <div class="coach-dock" aria-hidden="true">
 *   <video id="coachVideo" class="coach-media" preload="metadata" playsinline poster="..."></video>
 * </div>
 *
 * Trigger-Beispiel:
 * <button class="hint-chip coach-trigger"
 *         data-coach="ben"
 *         data-coach-src="media/preview-de-school.mp4"
 *         data-coach-poster="media/Preview_MinilabIntro_Ben_poster.png">...</button>
 */

(() => {
  'use strict';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const html     = document.documentElement;
  const backdrop = $('.coach-backdrop');
  const dock     = $('.coach-dock');
  const video    = $('#coachVideo', dock || document);

  if (!backdrop || !dock || !video) {
    console.warn('[coach-video] Markup unvollständig: .coach-backdrop/.coach-dock/#coachVideo erwartet.');
    return;
  }

  let unmuteOnceHandler = null;

  // --------------------------- Open / Close ---------------------------
  function openCoach(trigger) {
    const coach  = trigger.getAttribute('data-coach') || '';
    if (coach) html.setAttribute('data-coach', coach);

    const src    = trigger.getAttribute('data-coach-src')    || trigger.dataset.coachSrc    || '';
    const poster = trigger.getAttribute('data-coach-poster') || trigger.dataset.coachPoster || '';

    removeNavAndTranscript();
    hardenVideoShell(); // keine nativen Controls, kein PiP/FS/Remote, etc.

    // Video frisch bestücken
    try { video.pause(); } catch {}
    video.removeAttribute('src');
    $$('source', video).forEach(s => s.remove());
    if (src) {
      const source = document.createElement('source');
      source.src  = src;
      source.type = guessType(src);
      video.appendChild(source);
    }
    if (poster) video.setAttribute('poster', poster);
    try { video.load(); } catch {}

    // Sichtbar schalten (kein UI-Aufblitzen)
    setHidden(false);
    html.classList.add('coach-open');

    // Fokus nachgeladen
    const focusVideo = () => { try { video.focus({ preventScroll: true }); } catch {} };
    if (video.readyState >= 1) focusVideo();
    else video.addEventListener('loadedmetadata', focusVideo, { once: true });

    // Mit AUDIO starten (im selben Click-Handler = User-Gesture); Fallback: mute
    tryPlayWithSoundThenFallback();
  }

  function closeCoach() {
    try { video.pause(); } catch {}
    $$('source', video).forEach(s => s.remove());
    video.removeAttribute('src');
    try { video.load(); } catch {}
    setHidden(true);
    html.classList.remove('coach-open');
    clearUnmuteOnceHandler();
  }

  function setHidden(isHidden) {
    backdrop.setAttribute('aria-hidden', isHidden ? 'true' : 'false');
    dock.setAttribute('aria-hidden',     isHidden ? 'true' : 'false');
  }

  // -------- Landing-only: keine Navigation / kein Transcript ----------
  function removeNavAndTranscript() {
    // Pfeile jeglicher Art entfernen (falls im HTML vorhanden)
    $$('.coach-prev, .coach-next, .peek-prev, .peek-next', dock).forEach(el => el.remove());
    // Transcript entfernen
    $$('.coach-transcript', dock).forEach(el => el.remove());

    // Swipe/Drag neutralisieren, ohne Klicks zu blocken (Klicks brauchen wir für Audio-Entsperrung)
    const cancelDrag = (e) => {
      // Touch/Pointer-Gesten verhindern, Maus-Klicks erlauben
      if (!/mouse(down|up|move)/.test(e.type)) e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };
    ['touchstart','touchmove','touchend',
     'pointerdown','pointermove','pointerup',
     'gesturestart','gesturechange','gestureend']
      .forEach(evt => dock.addEventListener(evt, cancelDrag, true));

    dock.style.touchAction = 'pan-y';
    dock.style.webkitUserSelect = 'none';
    dock.style.userSelect = 'none';
  }

  // ------------------- Shell ohne native Controls ---------------------
  function hardenVideoShell() {
    if (video.__shelled) return;
    video.__shelled = true;

    // Keine nativen Controls überhaupt
    video.controls = false;
    video.removeAttribute('controls');

    // Inline, ohne Remote/PiP/Fullscreen
    video.setAttribute('playsinline','');
    video.setAttribute('webkit-playsinline','');
    video.setAttribute('controlsList','nodownload noplaybackrate noremoteplayback nofullscreen');
    video.setAttribute('disablepictureinpicture','');
    if ('disablePictureInPicture' in video) video.disablePictureInPicture = true;
    if ('disableRemotePlayback' in video)   video.disableRemotePlayback = true;
    video.setAttribute('x-webkit-airplay','deny');

    // Kein Kontextmenü / kein Doppelklick-Zoom / kein Klick-to-Play auf dem Video selbst
    const swall = (e) => { e.preventDefault(); e.stopImmediatePropagation(); };
    video.addEventListener('contextmenu', swall, true);
    video.addEventListener('dblclick',    swall, true);
    video.addEventListener('click',       swall, true);

    // Nicht fokussierbar per Tab
    video.setAttribute('tabindex','-1');
  }

  // ------------------- Play-Strategie (Audio zuerst) ------------------
  function tryPlayWithSoundThenFallback() {
    // ZUERST mit Ton versuchen (im selben Callstack wie der Button-Klick)
    try {
      video.muted = false; video.removeAttribute('muted'); video.volume = 1;
      const p = video.play();
      if (p && typeof p.then === 'function') {
        p.then(() => {
          // Erfolg mit Ton
          clearUnmuteOnceHandler();
        }).catch(() => {
          // Blockiert: stumm starten + beim nächsten Klick auf dem Dock erneut Ton versuchen
          playMutedThenScheduleUnmuteRetry();
        });
      }
    } catch {
      // Sicherheitsnetz
      playMutedThenScheduleUnmuteRetry();
    }
  }

  function playMutedThenScheduleUnmuteRetry() {
    try {
      video.muted = true; video.setAttribute('muted','');
      const p2 = video.play();
      if (p2 && typeof p2.then === 'function') p2.catch(()=>{});
    } catch {}

    // Beim nächsten User-Gesture (pointerdown ODER click) im Dock erneut Ton versuchen
    if (!unmuteOnceHandler) {
      unmuteOnceHandler = async (e) => {
        clearUnmuteOnceHandler();
        try {
          video.muted = false; video.removeAttribute('muted'); video.volume = 1;
          const p3 = video.play();
          if (p3 && typeof p3.then === 'function') await p3;
        } catch {
          // bleibt stumm; kein Hard-Fail
        }
      };
      // Capture, damit wir vor evtl. anderen Handlern drankommen
      dock.addEventListener('pointerdown', unmuteOnceHandler, true);
      dock.addEventListener('click',       unmuteOnceHandler, true);
    }
  }

  function clearUnmuteOnceHandler() {
    if (!unmuteOnceHandler) return;
    dock.removeEventListener('pointerdown', unmuteOnceHandler, true);
    dock.removeEventListener('click',       unmuteOnceHandler, true);
    unmuteOnceHandler = null;
  }

  // ESC schließt; Player-Shortcuts blocken (nur wenn offen)
  document.addEventListener('keydown', (e) => {
    if (backdrop.getAttribute('aria-hidden') === 'false') {
      const k = e.key;
      if (k === 'Escape') { e.preventDefault(); return closeCoach(); }
      if (k === ' ' || k === 'Spacebar' || k === 'ArrowLeft' || k === 'ArrowRight' ||
          k === 'j' || k === 'J' || k === 'k' || k === 'K' ||
          k === 'l' || k === 'L' ||
          k === 'f' || k === 'F' || k === 'm' || k === 'M' || k === 'Enter') {
        e.preventDefault(); e.stopImmediatePropagation();
      }
    }
  }, true);

  // ------------------------- Delegation (Open/Close) ------------------
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.coach-trigger');
    if (trigger) { e.preventDefault(); openCoach(trigger); return; }

    if (e.target === backdrop) { e.preventDefault(); closeCoach(); return; }
    if (e.target.closest('[data-close], .coach-close')) { e.preventDefault(); closeCoach(); return; }
  }, true);

  // Beim Initialisieren sofort alles absichern
  removeNavAndTranscript();
  hardenVideoShell();

  // Auto-close when the video ends (non-intrusive, global)
  video.addEventListener('ended', () => {
    if (backdrop.getAttribute('aria-hidden') === 'false') closeCoach();
  });

  // Utils
  function guessType(url) {
    const u = (url || '').split('?')[0].toLowerCase();
    if (u.endsWith('.webm')) return 'video/webm';
    if (u.endsWith('.ogv') || u.endsWith('.ogg')) return 'video/ogg';
    return 'video/mp4';
  }
})();