/* neural-orb.js — home-section rotating neural constellation (#neural-orb) */

document.addEventListener('DOMContentLoaded', () => {

  // ─── NEURAL ORB · HOME-SECTION CONSTELLATION ─────────────────
  // A large neural "planet" anchored at the hero's top-right corner — only ~a
  // quarter is on-screen, implying a much larger system beyond the viewport.
  // Surface nodes ride a slowly self-rotating 3D sphere (Fibonacci-spaced); a
  // thin mesh connects nearest neighbours; satellites orbit on tilted rings;
  // soft signal pulses occasionally travel along links and branch onward. Mild
  // mouse parallax tips the whole structure. Purely additive — it shares nothing
  // with, and never alters, the full-page #neural-bg field.
  const orb = document.getElementById('neural-orb');
  if (orb) {
    const octx = orb.getContext('2d');
    const orbWrap = orb.parentElement;
    const orbReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const orbFine = window.matchMedia('(pointer: fine)').matches;
    const orbSmall = window.matchMedia('(max-width: 768px)').matches;

    const GOLD = Math.PI * (3 - Math.sqrt(5));   // golden angle — even sphere spacing
    const N = orbSmall ? 46 : 80;                // surface nodes
    const KNN = 3;                               // links per node (nearest neighbours)
    const NPART = orbSmall ? 4 : 7;              // orbiting satellites
    const TILT = -0.42;                          // fixed axial tilt (rad)
    const SPIN = 0.000058;                       // self-rotation (rad/ms) ≈ 108s / turn
    const PERSP = 3.0;                           // gentle depth perspective
    const PULSE_GAP = 2600;                      // base ms between signal pulses
    const PULSE_MAX = 3;                         // concurrent pulses

    let oW = 0, oH = 0, ocx = 0, ocy = 0, oR = 0;
    let oNodes = [], oEdges = [], oParts = [], oPulses = [];
    let oRaf = null, oNextPulse = 0;
    // damped parallax: current (t/r) eased toward mouse-driven targets (mt/mr)
    const par = { tx: 0, ty: 0, rx: 0, ry: 0, mtx: 0, mty: 0, mrx: 0, mry: 0 };

    const orbResize = () => {
      const rect = orbWrap.getBoundingClientRect();
      oW = rect.width; oH = rect.height;
      if (!oW || !oH) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      orb.width = Math.round(oW * dpr);
      orb.height = Math.round(oH * dpr);
      octx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ocx = oW / 2; ocy = oH / 2;
      oR = Math.min(oW, oH) / 2 * 0.72;
    };

    const buildOrb = () => {
      // surface nodes — evenly distributed on a Fibonacci sphere
      oNodes = [];
      for (let i = 0; i < N; i++) {
        const y = 1 - (i / (N - 1)) * 2;                 // 1 → -1
        const rad = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = i * GOLD;
        const bx = Math.cos(theta) * rad, by = y, bz = Math.sin(theta) * rad;
        oNodes.push({
          lat: Math.asin(by), lon: Math.atan2(bz, bx),   // base spherical coords
          bx, by, bz,                                    // base unit vector (for KNN)
          p1: Math.random() * 6.283, p2: Math.random() * 6.283, tw: Math.random() * 6.283,
          sx: 0, sy: 0, uz: 0, pp: 1, adj: [],
        });
      }
      // connect each node to its KNN nearest neighbours (deduped, rigid mesh)
      oEdges = [];
      const seen = new Set();
      for (let i = 0; i < N; i++) {
        const d = [];
        for (let j = 0; j < N; j++) if (j !== i) {
          const dx = oNodes[i].bx - oNodes[j].bx;
          const dy = oNodes[i].by - oNodes[j].by;
          const dz = oNodes[i].bz - oNodes[j].bz;
          d.push([dx * dx + dy * dy + dz * dz, j]);
        }
        d.sort((a, b) => a[0] - b[0]);
        for (let k = 0; k < KNN && k < d.length; k++) {
          const j = d[k][1];
          const key = i < j ? i * N + j : j * N + i;
          if (!seen.has(key)) { seen.add(key); oEdges.push({ a: i, b: j }); }
        }
      }
      oEdges.forEach((e, i) => { oNodes[e.a].adj.push(i); oNodes[e.b].adj.push(i); });
      // satellites — each rides its own tilted orbital ring
      oParts = [];
      for (let i = 0; i < NPART; i++) {
        oParts.push({
          rad: 1.04 + Math.random() * 0.42,              // orbit radius (× sphere R)
          inc: Math.random() * Math.PI,                  // inclination
          asc: Math.random() * 6.283,                    // ascending-node rotation
          a0: Math.random() * 6.283,                     // phase
          spd: (0.00018 + Math.random() * 0.00022) * (Math.random() < 0.5 ? 1 : -1),
          sz: 0.9 + Math.random() * 0.8,
        });
      }
      oPulses = [];
    };

    const renderOrb = (now, animate) => {
      if (!oW || !oR) return;
      if (animate) {
        par.tx += (par.mtx - par.tx) * 0.05;
        par.ty += (par.mty - par.ty) * 0.05;
        par.rx += (par.mrx - par.rx) * 0.05;
        par.ry += (par.mry - par.ry) * 0.05;
        orb.style.transform = `translate3d(${par.tx.toFixed(2)}px, ${par.ty.toFixed(2)}px, 0)`;
      }
      octx.clearRect(0, 0, oW, oH);

      const spin = now * SPIN + par.ry;
      const cosY = Math.cos(spin), sinY = Math.sin(spin);
      const tilt = TILT + par.rx;
      const cosT = Math.cos(tilt), sinT = Math.sin(tilt);

      // project each node: surface drift → spin (Y) → axial tilt (X) → screen
      for (const n of oNodes) {
        const lat = n.lat + 0.022 * Math.sin(now * 0.00033 + n.p1);   // slow drift
        const lon = n.lon + 0.022 * Math.sin(now * 0.00041 + n.p2);   // along the surface
        const cl = Math.cos(lat);
        const x = cl * Math.cos(lon), y = Math.sin(lat), z = cl * Math.sin(lon);
        const x1 = x * cosY + z * sinY, z1 = -x * sinY + z * cosY;    // spin keeps y
        const y2 = y * cosT - z1 * sinT, z2 = y * sinT + z1 * cosT;   // tilt keeps x1
        const persp = PERSP / (PERSP - z2);
        n.sx = ocx + x1 * oR * persp;
        n.sy = ocy - y2 * oR * persp;
        n.uz = z2; n.pp = persp;
      }

      // mesh — thin links, depth-faded so the far side recedes
      octx.lineWidth = 0.75;
      for (const e of oEdges) {
        const p = oNodes[e.a], q = oNodes[e.b];
        const depth = 0.35 + 0.65 * ((p.uz + q.uz) * 0.5 + 1) * 0.5;
        octx.strokeStyle = `rgba(240,237,230,${(0.24 * depth).toFixed(3)})`;
        octx.beginPath(); octx.moveTo(p.sx, p.sy); octx.lineTo(q.sx, q.sy); octx.stroke();
      }

      // nodes — soft halo + bright core, gentle twinkle, depth-scaled
      for (const n of oNodes) {
        const depth = 0.3 + 0.7 * (n.uz + 1) * 0.5;
        const tw = 0.82 + 0.18 * Math.sin(now * 0.0012 + n.tw);
        const a = 0.55 * depth * tw;
        const r = (0.85 + 0.95 * depth) * n.pp;
        octx.fillStyle = `rgba(240,237,230,${(a * 0.2).toFixed(3)})`;
        octx.beginPath(); octx.arc(n.sx, n.sy, r * 3.6, 0, 6.2832); octx.fill();
        octx.fillStyle = `rgba(240,237,230,${a.toFixed(3)})`;
        octx.beginPath(); octx.arc(n.sx, n.sy, r, 0, 6.2832); octx.fill();
      }

      // satellites — tilted orbits that pass in front of and behind the sphere
      for (const pt of oParts) {
        const ang = pt.a0 + now * pt.spd;
        const ox = Math.cos(ang) * pt.rad, oz = Math.sin(ang) * pt.rad;
        const y1 = -oz * Math.sin(pt.inc), z1 = oz * Math.cos(pt.inc), x1 = ox;   // inclination
        const x2 = x1 * Math.cos(pt.asc) + z1 * Math.sin(pt.asc);                 // ascending node
        const z2 = -x1 * Math.sin(pt.asc) + z1 * Math.cos(pt.asc);
        const y3 = y1 * cosT - z2 * sinT, z3 = y1 * sinT + z2 * cosT;             // shared axial tilt
        const persp = PERSP / (PERSP - z3);
        const sx = ocx + x2 * oR * persp, sy = ocy - y3 * oR * persp;
        const depth = 0.25 + 0.75 * (z3 + 1) * 0.5;
        const a = 0.4 * depth, r = pt.sz * persp;
        octx.fillStyle = `rgba(240,237,230,${(a * 0.16).toFixed(3)})`;
        octx.beginPath(); octx.arc(sx, sy, r * 3, 0, 6.2832); octx.fill();
        octx.fillStyle = `rgba(240,237,230,${a.toFixed(3)})`;
        octx.beginPath(); octx.arc(sx, sy, r, 0, 6.2832); octx.fill();
      }

      // signal pulses — soft heads travelling along links, occasionally branching
      if (animate && now > oNextPulse && oPulses.length < PULSE_MAX && oEdges.length) {
        oPulses.push({ e: (Math.random() * oEdges.length) | 0, t0: now, dur: 1100 + Math.random() * 500, dir: Math.random() < 0.5, chained: false });
        oNextPulse = now + PULSE_GAP + Math.random() * 1800;
      }
      const spawn = [];
      oPulses = oPulses.filter(pl => now - pl.t0 < pl.dur);
      for (const pl of oPulses) {
        const e = oEdges[pl.e]; if (!e) continue;
        let p = oNodes[e.a], q = oNodes[e.b];
        if (pl.dir) { const t = p; p = q; q = t; }
        const prog = (now - pl.t0) / pl.dur;
        const ease = prog < 0.5 ? 2 * prog * prog : 1 - Math.pow(-2 * prog + 2, 2) / 2;
        const hx = p.sx + (q.sx - p.sx) * ease, hy = p.sy + (q.sy - p.sy) * ease;
        const fade = Math.sin(prog * Math.PI);                       // 0 → 1 → 0 envelope
        const depth = 0.45 + 0.55 * ((p.uz + q.uz) * 0.5 + 1) * 0.5;
        octx.lineWidth = 0.9;                                        // brighten the link
        octx.strokeStyle = `rgba(240,237,230,${(0.2 * fade * depth).toFixed(3)})`;
        octx.beginPath(); octx.moveTo(p.sx, p.sy); octx.lineTo(q.sx, q.sy); octx.stroke();
        const a = 0.45 * fade * depth;                              // travelling head
        octx.fillStyle = `rgba(240,237,230,${(a * 0.18).toFixed(3)})`;
        octx.beginPath(); octx.arc(hx, hy, 5, 0, 6.2832); octx.fill();
        octx.fillStyle = `rgba(240,237,230,${a.toFixed(3)})`;
        octx.beginPath(); octx.arc(hx, hy, 1.5, 0, 6.2832); octx.fill();
        // branch to a neighbouring link as the head arrives — a signal propagating
        if (animate && !pl.chained && prog > 0.8) {
          pl.chained = true;
          const dest = pl.dir ? e.a : e.b;
          if (oPulses.length + spawn.length < PULSE_MAX && Math.random() < 0.5) {
            const opts = oNodes[dest].adj.filter(ei => ei !== pl.e);
            if (opts.length) {
              const e2i = opts[(Math.random() * opts.length) | 0];
              spawn.push({ e: e2i, t0: now, dur: 1000 + Math.random() * 500, dir: oEdges[e2i].b === dest, chained: false });
            }
          }
        }
      }
      if (spawn.length) oPulses.push(...spawn);
    };

    const orbStep = (now) => { renderOrb(now, true); oRaf = requestAnimationFrame(orbStep); };
    const orbStart = () => { if (oRaf === null && !orbReduce) oRaf = requestAnimationFrame(orbStep); };
    const orbStop = () => { if (oRaf !== null) { cancelAnimationFrame(oRaf); oRaf = null; } };

    // mild parallax: the structure drifts and tips a touch toward the cursor
    if (orbFine) {
      window.addEventListener('mousemove', (e) => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        par.mtx = nx * 14; par.mty = ny * 14;     // ±7px translate
        par.mrx = ny * 0.05; par.mry = nx * 0.06; // subtle rotation bias
      }, { passive: true });
    }

    // run only while the hero is on-screen and the tab is visible
    let orbHeroVis = true, orbTabVis = !document.hidden;
    const orbSync = () => { (orbHeroVis && orbTabVis) ? orbStart() : orbStop(); };
    const heroSection = document.getElementById('hero');
    if (heroSection && 'IntersectionObserver' in window) {
      new IntersectionObserver((ents) => { orbHeroVis = ents[0].isIntersecting; orbSync(); }, { threshold: 0 }).observe(heroSection);
    }
    document.addEventListener('visibilitychange', () => { orbTabVis = !document.hidden; orbSync(); });
    // resize rescales in place (geometry persists); redraw the static pose under reduced motion
    window.addEventListener('resize', () => { orbResize(); if (orbReduce) renderOrb(4200, false); });

    orbResize(); buildOrb();
    if (orbReduce) renderOrb(4200, false);     // single static pose — no motion
    else orbStart();
    requestAnimationFrame(() => orbWrap.classList.add('is-on'));   // gentle fade-in

  }

});
