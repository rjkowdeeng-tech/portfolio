/* app.js — bootstrap (scroll reset) + preloader + hero intro */

/* always start at the very top on (re)load — don't restore the previous scroll */
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);
window.addEventListener('load', () => window.scrollTo(0, 0));

document.addEventListener('DOMContentLoaded', () => {

  // ─── PRELOADER ───────────────────────────────────────────────
  // Brief brand beat, never a wait: ~0.8s total, skipped under reduced motion.
  const preloader = document.getElementById('preloader');
  if (preloader && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    preloader.style.display = 'none';
  } else if (preloader) {
    let pct = 0;
    const pctEl = document.querySelector('.preloader-pct');
    const tick = setInterval(() => {
      pct = Math.min(pct + 16 + Math.random() * 14, 100);
      if (pctEl) pctEl.textContent = Math.floor(pct) + '%';
      if (pct >= 100) {
        clearInterval(tick);
        preloader.style.opacity = '0';
        preloader.style.transition = 'opacity 0.45s ease';
        setTimeout(() => {
          preloader.style.display = 'none';
          initAnimations();
        }, 450);
      }
    }, 40);
  }


  // ─── INIT ANIMATIONS (after preloader) ──────────────────────
  function initAnimations() {
    // Hero name slide-in
    const heroName = document.querySelector('.hero-name');
    if (heroName) {
      heroName.style.opacity = '1';
      heroName.style.transform = 'none';
    }
    // Stagger hero elements
    const heroEls = document.querySelectorAll('.hero-greeting, .hero-name, .hero-title, .ticker-wrap, .hero-desc, .hero-tags, .hero-ctas, .hero-stats');
    heroEls.forEach((el, i) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(24px)';
      setTimeout(() => {
        el.style.transition = `opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)`;
        el.style.opacity = '1';
        el.style.transform = 'none';
      }, 100 + i * 60);
    });
  }

});
