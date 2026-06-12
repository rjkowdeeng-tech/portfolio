/* background-neurons.js — full-page neural field + cursor gravity lens +
   scan pulses + magnetic typography (the #neural-bg system) */

document.addEventListener('DOMContentLoaded', () => {

  // ─── NEURAL NETWORK + CURSOR FIELD SYSTEM ────────────────────
  // Gravity lens: nodes drift toward the cursor, links bow subtly toward it.
  // AI field scanner: a slow pulse expands from the cursor every few seconds;
  // nodes brighten and hidden links surface briefly as the wavefront passes.
  // Magnetic typography: large display text leans 1–4px toward the cursor.
  const neural = document.getElementById('neural-bg');
  if (neural && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const nctx = neural.getContext('2d');
    const isSmall = window.matchMedia('(max-width: 768px)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    const LINK_DIST = isSmall ? 110 : 150;     // px before a connection forms
    const EXT_DIST = LINK_DIST * 1.55;         // hidden links, revealed by the scanner
    const MOUSE_RADIUS = 180;                  // gravity lens attraction range
    const BEND_RADIUS = 220;                   // links within this range bow toward cursor
    const MAG_RADIUS = 320;                    // typography attraction range
    const PULSE_EVERY = 4200;                  // ms between scan pulses
    const PULSE_LIFE = 2600;                   // ms a pulse takes to expand and fade
    const PULSE_MAX_R = 420;
    const nMouse = { x: -9999, y: -9999 };
    let nW, nH, nNodes = [], nRaf = null, pulses = [], lastPulse = 0;

    // magnetic typography targets (uses the independent `translate` property,
    // so it never fights the reveal system's `transform` transitions)
    const magEls = finePointer
      ? Array.from(document.querySelectorAll(
          '.hero-name, .hero-title, .about-headline, .contact-closing-words'
        )).map(el => { el.style.willChange = 'transform'; return { el, ox: 0, oy: 0 }; })
      : [];

    const neuralResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      nW = window.innerWidth;
      nH = window.innerHeight;
      neural.width = nW * dpr;
      neural.height = nH * dpr;
      nctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // node count scales with viewport, capped for performance
      const count = Math.min(isSmall ? 36 : 80, Math.round((nW * nH) / (isSmall ? 26000 : 17000)));
      nNodes = Array.from({ length: count }, () => ({
        x: Math.random() * nW,
        y: Math.random() * nH,
        bvx: (Math.random() - 0.5) * 0.22,    // constant slow drift
        bvy: (Math.random() - 0.5) * 0.22,
        ivx: 0, ivy: 0,                        // decaying impulse (gravity lens)
        r: 0.8 + Math.random() * 1.1,
        tw: Math.random() * Math.PI * 2,       // twinkle phase
        boost: 0,                              // scanner visibility boost
      }));
    };

    const neuralStep = () => {
      const now = performance.now();
      nctx.clearRect(0, 0, nW, nH);

      // emit a scan pulse from the cursor every few seconds
      if (finePointer && nMouse.x > -999 && now - lastPulse > PULSE_EVERY) {
        pulses.push({ x: nMouse.x, y: nMouse.y, t0: now });
        lastPulse = now;
      }
      pulses = pulses.filter(p => now - p.t0 < PULSE_LIFE);

      // wavefronts: eased expansion, fading as they travel
      const fronts = pulses.map(p => {
        const pr = (now - p.t0) / PULSE_LIFE;
        return {
          x: p.x, y: p.y,
          r: 30 + (PULSE_MAX_R - 30) * (1 - Math.pow(1 - pr, 3)),
          a: 1 - pr,
        };
      });

      // gravity lens: drift + gentle attraction; scanner boost per node
      for (const n of nNodes) {
        const dx = nMouse.x - n.x, dy = nMouse.y - n.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < MOUSE_RADIUS * MOUSE_RADIUS && d2 > 4) {
          const d = Math.sqrt(d2);
          const pull = 0.0005 * (1 - d / MOUSE_RADIUS);
          n.ivx += dx * pull;
          n.ivy += dy * pull;
        }
        // impulse decays so nodes settle back into drift
        n.ivx *= 0.96; n.ivy *= 0.96;
        n.x += n.bvx + Math.max(-0.5, Math.min(0.5, n.ivx));
        n.y += n.bvy + Math.max(-0.5, Math.min(0.5, n.ivy));
        // soft wrap at edges
        if (n.x < -20) n.x = nW + 20; else if (n.x > nW + 20) n.x = -20;
        if (n.y < -20) n.y = nH + 20; else if (n.y > nH + 20) n.y = -20;
        // nodes near a passing wavefront briefly become more visible
        n.boost = 0;
        for (const f of fronts) {
          const dd = Math.abs(Math.hypot(n.x - f.x, n.y - f.y) - f.r);
          if (dd < 50) n.boost += (1 - dd / 50) * f.a * 0.35;
        }
      }

      // connections — distance-faded; scanner reveals hidden ones momentarily
      nctx.lineWidth = 0.6;
      const reach = fronts.length ? EXT_DIST : LINK_DIST;
      for (let a = 0; a < nNodes.length; a++) {
        for (let b = a + 1; b < nNodes.length; b++) {
          const p = nNodes[a], q = nNodes[b];
          const dx = p.x - q.x;
          if (dx > reach || dx < -reach) continue;
          const dy = p.y - q.y;
          if (dy > reach || dy < -reach) continue;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d >= reach) continue;

          const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
          let alpha = 0;
          if (d < LINK_DIST) {
            alpha = (1 - d / LINK_DIST) * 0.06;
            // scanner clarity: existing links sharpen as the wavefront passes
            for (const f of fronts) {
              const dd = Math.abs(Math.hypot(mx - f.x, my - f.y) - f.r);
              if (dd < 60) alpha += (1 - dd / 60) * f.a * 0.05;
            }
          } else {
            // hidden link — only surfaces while a wavefront passes through it
            for (const f of fronts) {
              const dd = Math.abs(Math.hypot(mx - f.x, my - f.y) - f.r);
              if (dd < 60) alpha = Math.max(alpha, (1 - dd / 60) * f.a * 0.045);
            }
            if (alpha <= 0.004) continue;
          }

          nctx.strokeStyle = `rgba(240,237,230,${alpha.toFixed(3)})`;
          nctx.beginPath();
          nctx.moveTo(p.x, p.y);
          // gravity lens: lines near the cursor bow subtly toward it
          const dcx = nMouse.x - mx, dcy = nMouse.y - my;
          const dc = Math.sqrt(dcx * dcx + dcy * dcy);
          if (dc < BEND_RADIUS && dc > 1) {
            const bend = (1 - dc / BEND_RADIUS) * 10;
            nctx.quadraticCurveTo(mx + (dcx / dc) * bend, my + (dcy / dc) * bend, q.x, q.y);
          } else {
            nctx.lineTo(q.x, q.y);
          }
          nctx.stroke();
        }
      }

      // dots — soft halo + slow twinkle + scanner boost
      for (const n of nNodes) {
        n.tw += 0.005;
        const a = Math.min(0.4, 0.16 + Math.sin(n.tw) * 0.07 + n.boost);
        nctx.fillStyle = `rgba(240,237,230,${(a * 0.25).toFixed(3)})`;
        nctx.beginPath(); nctx.arc(n.x, n.y, n.r * 3, 0, 6.2832); nctx.fill();
        nctx.fillStyle = `rgba(240,237,230,${a.toFixed(3)})`;
        nctx.beginPath(); nctx.arc(n.x, n.y, n.r, 0, 6.2832); nctx.fill();
      }

      // scanner rings emanating from the cursor
      nctx.lineWidth = 1;
      for (const f of fronts) {
        nctx.strokeStyle = `rgba(240,237,230,${(f.a * 0.07).toFixed(3)})`;
        nctx.beginPath();
        nctx.arc(f.x, f.y, f.r, 0, 6.2832);
        nctx.stroke();
      }

      // magnetic typography — critically damped approach, no overshoot
      for (const m of magEls) {
        const rect = m.el.getBoundingClientRect();
        let tx = 0, ty = 0;
        if (rect.bottom > 0 && rect.top < nH) {
          const cx = rect.left + rect.width / 2 - m.ox;   // rest-position center
          const cy = rect.top + rect.height / 2 - m.oy;
          const dx = nMouse.x - cx, dy = nMouse.y - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < MAG_RADIUS && d > 1) {
            const s = (1 - d / MAG_RADIUS) * 4;            // 4px max shift
            tx = (dx / d) * s;
            ty = (dy / d) * s;
          }
        }
        m.ox += (tx - m.ox) * 0.06;
        m.oy += (ty - m.oy) * 0.06;
        m.el.style.translate = m.ox.toFixed(2) + 'px ' + m.oy.toFixed(2) + 'px';
      }

      nRaf = requestAnimationFrame(neuralStep);
    };

    const neuralStart = () => { if (nRaf === null) nRaf = requestAnimationFrame(neuralStep); };
    const neuralStop = () => { if (nRaf !== null) { cancelAnimationFrame(nRaf); nRaf = null; } };

    window.addEventListener('mousemove', e => { nMouse.x = e.clientX; nMouse.y = e.clientY; });
    document.addEventListener('mouseleave', () => { nMouse.x = -9999; nMouse.y = -9999; });
    window.addEventListener('resize', neuralResize);
    // pause everything when the tab is inactive
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) neuralStop(); else neuralStart();
    });

    neuralResize();
    neuralStart();
  }

});
