/* interactions.js — cursor, mobile menu, footer clock, reveals, focus cards,
   active-nav, hero parallax, contact form, sticky projects, process timeline,
   about pixel-dissolve, smooth anchor scroll */

document.addEventListener('DOMContentLoaded', () => {

  // ─── CUSTOM CURSOR ────────────────────────────────────────────
  // Inner dot tracks the pointer 1:1; the triangle ring lags behind and
  // rotates: it aims its apex along the direction of travel, swings to point
  // at nearby clickable elements, and squeezes on click.
  const cursor = document.getElementById('cursor');
  const cursorRing = document.getElementById('cursor-ring');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let mx = 0, my = 0, rx = 0, ry = 0;       // pointer + lagged ring position
  let lastMx = 0, lastMy = 0, vx = 0, vy = 0; // smoothed pointer velocity
  let angle = 0;                             // ring rotation, deg (0 = apex up)
  let pressScale = 1, pressTarget = 1;       // click squeeze

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    if (cursor) {
      cursor.style.left = mx + 'px';
      cursor.style.top = my + 'px';
    }
  });

  document.addEventListener('mousedown', () => { pressTarget = 0.72; });
  document.addEventListener('mouseup',   () => { pressTarget = 1; });

  // Cache the rects of clickable targets; refresh only when layout may shift.
  const CURSOR_TARGETS = 'a, button, [role="button"], input, textarea, label, .focus-card';
  let rects = [], rectsDirty = true;
  const markRectsDirty = () => { rectsDirty = true; };
  const refreshRects = () => {
    rects = Array.from(document.querySelectorAll(CURSOR_TARGETS)).map(el => {
      const r = el.getBoundingClientRect();
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2,
               l: r.left, t: r.top, r: r.right, b: r.bottom };
    });
    rectsDirty = false;
  };
  window.addEventListener('scroll', markRectsDirty, { passive: true });
  window.addEventListener('resize', markRectsDirty);
  setTimeout(markRectsDirty, 600); // catch late-rendered content

  const ATTRACT_RADIUS = 130; // px: distance at which the apex locks onto a target

  const animCursor = () => {
    // lagged follow
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;

    // smoothed velocity (direction of travel)
    vx += ((mx - lastMx) - vx) * 0.3;
    vy += ((my - lastMy) - vy) * 0.3;
    lastMx = mx; lastMy = my;

    if (cursorRing) {
      if (reduceMotion) {
        cursorRing.style.left = rx + 'px';
        cursorRing.style.top = ry + 'px';
      } else {
        if (rectsDirty) refreshRects();

        // nearest clickable within range (distance to its closest edge)
        let near = null, nearDist = ATTRACT_RADIUS;
        for (const r of rects) {
          const nx = Math.max(r.l, Math.min(rx, r.r));
          const ny = Math.max(r.t, Math.min(ry, r.b));
          const d = Math.hypot(rx - nx, ry - ny);
          if (d < nearDist) { nearDist = d; near = r; }
        }

        // decide apex direction: lock onto a target, else follow movement
        let targetAngle = angle;
        if (near) {
          const dx = near.cx - rx, dy = near.cy - ry;
          if (Math.hypot(dx, dy) > 6) targetAngle = Math.atan2(dx, -dy) * 180 / Math.PI;
        } else if (Math.hypot(vx, vy) > 0.6) {
          targetAngle = Math.atan2(vx, -vy) * 180 / Math.PI;
        }

        // ease along the shortest rotational path
        const delta = ((targetAngle - angle + 540) % 360) - 180;
        angle += delta * 0.18;

        pressScale += (pressTarget - pressScale) * 0.25;

        cursorRing.style.left = rx + 'px';
        cursorRing.style.top = ry + 'px';
        cursorRing.style.transform =
          `translate(-50%, -50%) rotate(${angle}deg) scale(${pressScale})`;
      }
    }

    // dot shares the click squeeze
    if (cursor && !reduceMotion) {
      cursor.style.transform = `translate(-50%, -50%) scale(${pressScale})`;
    }

    requestAnimationFrame(animCursor);
  };
  animCursor();


  // ─── MOBILE MENU ─────────────────────────────────────────────
  const menuBtn = document.getElementById('menu-btn');
  const mobileNav = document.getElementById('mobile-nav');
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', () => {
      const open = menuBtn.classList.toggle('open');
      mobileNav.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', open);
    });
    mobileNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        menuBtn.classList.remove('open');
        mobileNav.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Footer local time
  const footerTimeEl = document.getElementById('footer-time');
  const updateFooterTime = () => {
    const now = new Date();
    const ph = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const h = ph.getUTCHours().toString().padStart(2, '0');
    const m = ph.getUTCMinutes().toString().padStart(2, '0');
    if (footerTimeEl) footerTimeEl.textContent = `PH — ${h}:${m} LOCAL TIME`;
  };
  setInterval(updateFooterTime, 1000);
  updateFooterTime();


  // ─── SCROLL REVEAL ──────────────────────────────────────────
  const revealEls = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach(el => observer.observe(el));


  // ─── FOCUS CARDS (click to expand, one open at a time) ──────
  const focusCards = document.querySelectorAll('.focus-card');
  focusCards.forEach(card => {
    card.addEventListener('click', () => {
      const willOpen = !card.classList.contains('is-open');
      // collapse any previously opened card
      focusCards.forEach(c => {
        c.classList.remove('is-open');
        c.setAttribute('aria-expanded', 'false');
      });
      if (willOpen) {
        card.classList.add('is-open');
        card.setAttribute('aria-expanded', 'true');
      }
      // replay the ripple/pulse
      card.classList.remove('is-pulsing');
      void card.offsetWidth;            // force reflow so the animation restarts
      card.classList.add('is-pulsing');
    });
    card.addEventListener('animationend', (e) => {
      if (e.animationName === 'focus-pulse') card.classList.remove('is-pulsing');
    });
  });


  // ─── ACTIVE NAV LINK ─────────────────────────────────────────
  // Track only sections the nav actually links to, and fire when a section
  // crosses the middle band of the viewport (tall sections never reach a
  // 40% visibility threshold, so a band is the reliable approach).
  const navLinks = document.querySelectorAll('.nav-links a');
  const navTargets = Array.from(navLinks)
    .map(a => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);

  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(a => {
          a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id);
        });
      }
    });
  }, { rootMargin: '-35% 0px -60% 0px', threshold: 0 });
  navTargets.forEach(s => navObserver.observe(s));


  // ─── ABOUT IMAGES HOVER ──────────────────────────────────────
  // Already handled with CSS


  // ─── HERO PARALLAX BG TEXT ──────────────────────────────────
  const heroBgText = document.querySelector('.hero-bg-text');
  if (heroBgText) {
    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY;
      heroBgText.style.transform = `translateY(calc(-50% + ${scrolled * 0.2}px))`;
    });
  }


  // ─── FORM SUBMIT ─────────────────────────────────────────────
  // No backend — compose a real email instead of faking a "Sent" state.
  const formBtn = document.getElementById('form-submit');
  if (formBtn) {
    formBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const name = document.getElementById('f-name').value.trim();
      const email = document.getElementById('f-email').value.trim();
      const subject = document.getElementById('f-subject').value.trim();
      const msg = document.getElementById('f-msg').value.trim();
      if (!name || !email || !msg) {
        formBtn.textContent = 'Fill all fields →';
        setTimeout(() => formBtn.innerHTML = 'Send Message&nbsp;&rarr;', 2000);
        return;
      }
      const body = msg + '\n\n— ' + name + ' (' + email + ')';
      window.location.href = 'mailto:rjkowdeeng@gmail.com'
        + '?subject=' + encodeURIComponent(subject || 'Hello from your portfolio')
        + '&body=' + encodeURIComponent(body);
      formBtn.textContent = 'Opening your email app →';
      setTimeout(() => formBtn.innerHTML = 'Send Message&nbsp;&rarr;', 3000);
    });
  }


  const projectItems = document.querySelectorAll('.project-item');


  // ─── PROJECTS · STICKY PAPER-STACK ───────────────────────────
  // Each card pins near the top; as the next card rises it lays over the
  // previous one, which recedes (scales in + dims + blurs) — sheets stacking.
  // Each card's `--s` (0 → 1) tracks how far its *next* sibling has covered it.
  // Desktop/tablet only (the CSS rules live in @media (min-width:769px)).
  const projList = document.querySelector('.project-list');
  const reduceMotionStack = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (projList && projectItems.length > 1 && !reduceMotionStack) {
    const STACK_TOP = 86;   // px from viewport top where cards pin
    const SLIVER = 16;      // each card pins a little lower, so edges peek through
    const cards = Array.from(projectItems);
    projList.classList.add('stack');
    cards.forEach((card, i) => { card.style.top = (STACK_TOP + i * SLIVER) + 'px'; });

    const clampS = v => (v < 0 ? 0 : v > 1 ? 1 : v);
    const smooth = t => t * t * (3 - 2 * t);   // smoothstep — eases the recede
    let stackTicking = false;
    const updateStack = () => {
      stackTicking = false;
      const coverDist = window.innerHeight * 0.6;   // scroll distance over which a card recedes
      cards.forEach((card, i) => {
        const next = cards[i + 1];
        let s = 0;
        if (next) {
          const pin = STACK_TOP + (i + 1) * SLIVER;             // where `next` comes to rest
          const nextTop = next.getBoundingClientRect().top;
          s = clampS(1 - (nextTop - pin) / coverDist);          // 0 until next nears, 1 once it covers
        }
        card.style.setProperty('--s', smooth(s).toFixed(4));
      });
    };
    const onStackScroll = () => {
      if (!stackTicking) { stackTicking = true; requestAnimationFrame(updateStack); }
    };
    window.addEventListener('scroll', onStackScroll, { passive: true });
    window.addEventListener('resize', onStackScroll, { passive: true });
    updateStack();
  }


  // ─── PROCESS · SEQUENTIAL STEP REVEAL ────────────────────────
  // Strictly one at a time, in order: a step reveals only once its top passes
  // the trigger line AND the step before it has already revealed. A minimum
  // gap keeps fast scrolls from popping several at once.
  const timelineSteps = Array.from(document.querySelectorAll('.timeline-step'));
  if (timelineSteps.length) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      timelineSteps.forEach(s => s.classList.add('visible'));   // no motion — just show them
    } else {
      let nextIdx = 0;
      let lastReveal = 0;
      const MIN_GAP = 360;     // ms enforced between consecutive reveals
      const TRIGGER = 0.82;    // a step reveals once its top passes this fraction of the viewport
      let rafId = null;
      const tick = (now) => {
        rafId = null;
        if (nextIdx >= timelineSteps.length) return;
        const line = window.innerHeight * TRIGGER;
        if (timelineSteps[nextIdx].getBoundingClientRect().top <= line) {
          if (now - lastReveal >= MIN_GAP) {
            timelineSteps[nextIdx].classList.add('visible');
            nextIdx++;
            lastReveal = now;
          }
          rafId = requestAnimationFrame(tick);   // keep cascading until caught up to scroll
        }
      };
      const onStepScroll = () => { if (rafId === null) rafId = requestAnimationFrame(tick); };
      window.addEventListener('scroll', onStepScroll, { passive: true });
      window.addEventListener('resize', onStepScroll, { passive: true });
      requestAnimationFrame(tick);
    }
  }


  // ─── PROCESS · TIMELINE DRAW-ON-SCROLL ───────────────────────
  // The bright spine fill grows as the timeline passes a point on screen,
  // setting --tp (0 → 1).
  const timelineEl = document.querySelector('.timeline');
  if (timelineEl && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const clampT = v => (v < 0 ? 0 : v > 1 ? 1 : v);
    let tlTicking = false;
    const updateTimeline = () => {
      tlTicking = false;
      const rect = timelineEl.getBoundingClientRect();
      const anchor = window.innerHeight * 0.7;          // the draw point on screen
      const tp = clampT((anchor - rect.top) / rect.height);
      timelineEl.style.setProperty('--tp', tp.toFixed(4));
      // once the fill lands at the very bottom, ripple out from it like a drop in water
      timelineEl.classList.toggle('rippling', tp >= 0.99 && rect.bottom > 0);
    };
    const onTl = () => {
      if (!tlTicking) { tlTicking = true; requestAnimationFrame(updateTimeline); }
    };
    window.addEventListener('scroll', onTl, { passive: true });
    window.addEventListener('resize', onTl, { passive: true });
    updateTimeline();
  }


  // ─── ABOUT · PIXEL-DISSOLVE REVEAL ───────────────────────────
  // The About section fills the screen under a canvas of background-coloured
  // blocks; once it scrolls up to fill the screen the dissolve auto-plays once
  // (time-based, never reversing) to unveil the content. Desktop only, and only
  // when the content fits within one screen (else About renders normally).
  const pxAbout = document.getElementById('about');
  const pxCanvas = pxAbout && pxAbout.querySelector('.about-pixels');
  const pxBody = pxAbout && pxAbout.querySelector('.about-body');
  if (pxAbout && pxCanvas && pxBody && pxCanvas.getContext) {
    const PX_CELL = 70;          // pixel-block size
    const PX_STAGGER = 3;        // a column starts after this many blocks of the one to its right
    const PX_INSET = 64;         // pull the grid in from the content edges (cover the text, not the screen)
    const PX_TOP_ROWS = 2;       // extra block rows above the content
    const PX_BOT_ROWS = 2;       // extra block rows below the content
    // blocks are the exact page background, so the cover is invisible and content
    // simply materialises block by block as the wave clears them (no grid lines)
    const BG = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#080808';
    const DISSOLVE_MS = 2000;    // one-time dissolve duration
    const pxCtx = pxCanvas.getContext('2d');
    let pxCells = [], pxMaxOrder = 0, pxActive = false, pxShineRaf = null;
    let pxTriggered = false, pxStart = 0;                   // one-shot, time-based dissolve

    const pxFits = () =>
      window.innerWidth >= 1025 &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches &&
      pxBody.offsetHeight <= window.innerHeight - 24;   // small margin so nothing clips

    const pxBuild = () => {
      const w = pxCanvas.clientWidth, h = pxCanvas.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      pxCanvas.width = Math.round(w * dpr);
      pxCanvas.height = Math.round(h * dpr);
      pxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // cover only the About content box, inset so the grid hugs the text (not the screen edges)
      const cRect = pxCanvas.getBoundingClientRect();
      const bRect = pxBody.getBoundingClientRect();
      const x0 = Math.max(0, Math.round(bRect.left - cRect.left) + PX_INSET);
      const x1 = Math.min(w, Math.round(bRect.right - cRect.left) - PX_INSET);
      const yTop = Math.round(bRect.top - cRect.top) + PX_INSET;
      const yBot = Math.min(h, Math.round(bRect.bottom - cRect.top) - PX_INSET);
      const nCols = Math.max(1, Math.ceil((x1 - x0) / PX_CELL));
      const baseRows = Math.max(1, Math.ceil((yBot - yTop) / PX_CELL));
      const y0 = yTop - PX_TOP_ROWS * PX_CELL;             // extra rows above the content
      const nRows = baseRows + PX_TOP_ROWS + PX_BOT_ROWS;  // + extra row(s) below
      pxMaxOrder = (nCols - 1) * PX_STAGGER + (nRows - 1);
      // dissolve order: bottom-right block first, up the right column; each column to the
      // left starts PX_STAGGER blocks later — a diagonal wave sweeping up and to the left
      pxCells = [];
      for (let r = 0; r < nRows; r++) {
        for (let c = 0; c < nCols; c++) {
          pxCells.push({
            x: x0 + c * PX_CELL,
            y: y0 + r * PX_CELL,
            order: (nCols - 1 - c) * PX_STAGGER + (nRows - 1 - r),
            cleared: false,
          });
        }
      }
      pxCtx.clearRect(0, 0, w, h);   // the render loop paints the covered blocks
    };

    // one render loop: auto-start the dissolve when the section fills the screen, advance
    // it by time (never reversing — stays revealed once dissolved), and paint the covered
    // background-coloured blocks each frame.
    const pxShine = (now) => {
      pxShineRaf = pxActive ? requestAnimationFrame(pxShine) : null;
      const vh = window.innerHeight;
      const r = pxAbout.getBoundingClientRect();
      // auto-start once the section has scrolled up to fill the screen
      if (!pxTriggered && r.top <= vh * 0.02 && r.bottom >= vh * 0.5) {
        pxTriggered = true; pxStart = now;
      }
      // time-based, one-way dissolve (cleared blocks never come back)
      if (pxTriggered) {
        const t = Math.min(1, (now - pxStart) / DISSOLVE_MS) * pxMaxOrder;
        for (const c of pxCells) if (!c.cleared && c.order <= t) c.cleared = true;
      }
      if (r.bottom < -vh || r.top > 2 * vh) return;        // far from view — skip painting
      const w = pxCanvas.clientWidth, h = pxCanvas.clientHeight;
      pxCtx.clearRect(0, 0, w, h);
      pxCtx.fillStyle = BG;
      for (const c of pxCells) if (!c.cleared) pxCtx.fillRect(c.x, c.y, PX_CELL, PX_CELL);
    };

    const pxEvaluate = () => {
      const shouldRun = pxFits();
      if (shouldRun && !pxActive) {
        pxAbout.classList.add('pixelate');
        pxBuild();
        pxActive = true;
        if (!pxShineRaf) pxShineRaf = requestAnimationFrame(pxShine);
      } else if (!shouldRun && pxActive) {
        pxAbout.classList.remove('pixelate');
        if (pxShineRaf) { cancelAnimationFrame(pxShineRaf); pxShineRaf = null; }
        pxCtx.clearRect(0, 0, pxCanvas.width, pxCanvas.height);
        pxActive = false;
      } else if (shouldRun && pxActive) {
        pxBuild();                                          // rebuild on resize (the loop re-applies dissolve state)
      }
    };

    let pxResizeTimer = null;
    const pxOnResize = () => {
      if (pxResizeTimer) clearTimeout(pxResizeTimer);
      pxResizeTimer = setTimeout(pxEvaluate, 200);        // rebuild only after resize settles
    };
    window.addEventListener('resize', pxOnResize, { passive: true });
    pxEvaluate();
    // re-measure once web fonts settle (they can change the content height)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(pxEvaluate);
  }


  // ─── SMOOTH SCROLL FOR ANCHOR LINKS ──────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1);
      const el = document.getElementById(id);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

});
