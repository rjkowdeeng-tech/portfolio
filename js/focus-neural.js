/* focus-neural.js — Focus Areas interactive neural-link layer.
   While the cursor is inside the Focus Areas section it becomes a live "source
   node": eased links reach toward the centre of every focus card and particles
   travel along them. The card boxes are clipped out of the drawing region every
   frame, so a link is cut cleanly at the card edge and never paints over a card
   — text and the expandable description stay fully readable. Everything draws on
   a canvas pinned behind the cards (z-index 0). Desktop / motion-OK only;
   entirely additive. */

document.addEventListener('DOMContentLoaded', () => {

  // ─── FOCUS AREAS · CURSOR-DRIVEN NEURAL NETWORK ──────────────
  const section = document.querySelector('.focus-section');
  const canvas  = section ? section.querySelector('.focus-neural') : null;
  const fnReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fnFine   = window.matchMedia('(pointer: fine)').matches;

  if (canvas && section && !fnReduce && fnFine) {
    const fctx  = canvas.getContext('2d');
    const cards = Array.from(section.querySelectorAll('.focus-card'));
    const RGB   = '240,237,230';                 // shared warm off-white

    let fW = 0, fH = 0, fLeft = 0, fTop = 0;     // canvas box (CSS px + page offset)
    let fRaf = null, running = false;

    // raw cursor (client coords) + eased source node (canvas-local)
    const mouse = { x: 0, y: 0, has: false };
    const src   = { x: 0, y: 0 };
    let act = 0, snap = false;                    // activation 0→1, snap src on entry

    // one anchor per card; particles ride the cursor→anchor link
    const PARTS = 2;
    const anchors = cards.map((card, i) => ({
      card, x: 0, y: 0, cx: 0, cy: 0,
      seed: i * 1.7,                              // desync curvature + pulse
      parts: Array.from({ length: PARTS }, (_, k) => ({
        phase: (k / PARTS) + i * 0.13,           // staggered along the link
        dur: 1700 + ((i * 230 + k * 540) % 1100),// ms per traversal (deterministic)
      })),
    }));

    const fnResize = () => {
      const r = canvas.getBoundingClientRect();
      fW = r.width; fH = r.height;
      if (!fW || !fH) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = Math.round(fW * dpr);
      canvas.height = Math.round(fH * dpr);
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // quadratic-bézier coordinate (the gentle bow gives links an organic feel)
    const bez = (a, c, b, t) => { const u = 1 - t; return u * u * a + 2 * u * t * c + t * t * b; };

    const fnStep = (now) => {
      const rect = canvas.getBoundingClientRect();
      fLeft = rect.left; fTop = rect.top;
      if (Math.abs(rect.width - fW) > 0.5 || Math.abs(rect.height - fH) > 0.5) fnResize();

      // activation easing — rises briskly, falls slowly (no abrupt vanish)
      const target = mouse.has ? 1 : 0;
      act += (target - act) * (target > act ? 0.085 : 0.05);

      // source node eases toward the cursor; snap on first entry to avoid a swoop
      const tx = mouse.x - fLeft, ty = mouse.y - fTop;
      if (snap) { src.x = tx; src.y = ty; snap = false; }
      else { src.x += (tx - src.x) * 0.2; src.y += (ty - src.y) * 0.2; }

      fctx.clearRect(0, 0, fW, fH);

      // fully faded out and nothing pending → stop the loop (clears stay clear)
      if (act < 0.002 && target === 0) { running = false; fRaf = null; return; }

      // live card boxes — read every frame so the network tracks the orbit
      // drift and any card expansion; the link aims at the box centre but is
      // clipped at the card edge (below) so it never crosses the text
      for (const an of anchors) {
        const cr = an.card.getBoundingClientRect();
        an.rl = cr.left - fLeft; an.rt = cr.top - fTop;
        an.rw = cr.width; an.rh = cr.height;
        an.x = an.rl + an.rw / 2;
        an.y = an.rt + an.rh / 2;
      }

      // clip every card box out of the drawing region (+6px breathing gap), so
      // no line or particle is ever painted over a card — text stays clear
      fctx.save();
      fctx.beginPath();
      fctx.rect(0, 0, fW, fH);
      for (const an of anchors) fctx.rect(an.rl - 6, an.rt - 6, an.rw + 12, an.rh + 12);
      fctx.clip('evenodd');

      for (const an of anchors) {
        const dx = an.x - src.x, dy = an.y - src.y;
        const len = Math.hypot(dx, dy) || 1;
        // control point: midpoint nudged perpendicular, slow breathing
        const mx = (src.x + an.x) / 2, my = (src.y + an.y) / 2;
        const nx = -dy / len, ny = dx / len;
        const bow = Math.min(26, len * 0.14) * Math.sin(now * 0.0006 + an.seed);
        an.cx = mx + nx * bow; an.cy = my + ny * bow;

        const energy = 0.72 + 0.28 * Math.sin(now * 0.0019 + an.seed * 2.1);
        const a = act * energy;

        // link — soft glow underlay beneath a thin bright core line
        fctx.lineWidth = 3.2;
        fctx.strokeStyle = `rgba(${RGB},${(a * 0.05).toFixed(3)})`;
        fctx.beginPath(); fctx.moveTo(src.x, src.y); fctx.quadraticCurveTo(an.cx, an.cy, an.x, an.y); fctx.stroke();
        fctx.lineWidth = 0.9;
        fctx.strokeStyle = `rgba(${RGB},${(a * 0.16).toFixed(3)})`;
        fctx.beginPath(); fctx.moveTo(src.x, src.y); fctx.quadraticCurveTo(an.cx, an.cy, an.x, an.y); fctx.stroke();

        // particles travelling the link (clipped away as they reach the card)
        for (const p of an.parts) {
          const t = ((now / p.dur) + p.phase) % 1;
          const px = bez(src.x, an.cx, an.x, t);
          const py = bez(src.y, an.cy, an.y, t);
          const env = Math.sin(t * Math.PI);          // fade in/out at the ends
          const pa = act * env * 0.5;
          fctx.fillStyle = `rgba(${RGB},${(pa * 0.18).toFixed(3)})`;
          fctx.beginPath(); fctx.arc(px, py, 4.5, 0, 6.2832); fctx.fill();
          fctx.fillStyle = `rgba(${RGB},${pa.toFixed(3)})`;
          fctx.beginPath(); fctx.arc(px, py, 1.4, 0, 6.2832); fctx.fill();
        }
      }

      // source node — faint halo so the links visibly originate at the cursor;
      // kept inside the clip so it too is suppressed over a card (the cursor's
      // own custom dot still shows there, but nothing bleeds behind the text)
      fctx.fillStyle = `rgba(${RGB},${(act * 0.16).toFixed(3)})`;
      fctx.beginPath(); fctx.arc(src.x, src.y, 11, 0, 6.2832); fctx.fill();
      fctx.fillStyle = `rgba(${RGB},${(act * 0.5).toFixed(3)})`;
      fctx.beginPath(); fctx.arc(src.x, src.y, 2, 0, 6.2832); fctx.fill();

      fctx.restore();   // release the card clip

      fRaf = requestAnimationFrame(fnStep);
    };

    const fnStart = () => { if (!running) { running = true; fRaf = requestAnimationFrame(fnStep); } };

    // pointer plumbing — coords update only on move; no DOM work per move
    const onEnter = (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.has = true; snap = true; fnStart(); };
    section.addEventListener('mouseenter', onEnter);
    section.addEventListener('mousemove', (e) => {
      mouse.x = e.clientX; mouse.y = e.clientY;
      if (!mouse.has) { mouse.has = true; snap = true; }
      fnStart();
    }, { passive: true });
    section.addEventListener('mouseleave', () => { mouse.has = false; });

    window.addEventListener('resize', fnResize);
    if ('ResizeObserver' in window) new ResizeObserver(fnResize).observe(section);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (fRaf) cancelAnimationFrame(fRaf); fRaf = null; running = false; }
      else if (mouse.has || act > 0.002) fnStart();
    });

    fnResize();
  }

});
