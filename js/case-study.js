/* ─── MISSION DEBRIEF · case-study modal ───────────────────────
   Populates one reusable dialog from per-project data, dims the page,
   and handles ESC / outside-click / focus management + a simple tab trap. */
(() => {
  const overlay = document.getElementById('debrief');
  if (!overlay) return;

  // Per-project intelligence reports, keyed by the button's data-debrief value.
  const DATA = {
    'this-site': {
      id: 'NODE 01 // PORTFOLIO',
      title: 'This Site.',
      subtitle: 'Project Analysis Node',
      problem: 'Most junior developers struggle to stand out because portfolios often look identical, making it hard for visitors to quickly understand what makes the developer different.',
      approach: 'Built a portfolio that blends storytelling, neural-inspired visuals, and AI-assisted workflows to create a more memorable experience while keeping the focus on real projects and practical skills.',
      tools: ['HTML5', 'CSS3', 'JavaScript', 'Node.js', 'Claude Code', 'ChatGPT', 'Git', 'GitHub', 'Render'],
    },
    'automation-lab': {
      id: 'NODE 02 // AUTOMATION',
      title: 'Automation Lab.',
      subtitle: 'Project Analysis Node',
      problem: 'Everyday tasks — renaming files, reformatting data, repetitive copy-paste — quietly drain hours that could go toward real building and learning.',
      approach: 'Built a growing set of small AI-assisted scripts and workflows, treating each automation as an experiment and documenting what worked, what broke, and what each one taught me.',
      tools: ['JavaScript', 'Python', 'Claude Code', 'ChatGPT', 'Automation APIs', 'Git', 'GitHub'],
    },
    'practice-builds': {
      id: 'NODE 03 // PRACTICE',
      title: 'Practice Builds.',
      subtitle: 'Project Analysis Node',
      problem: 'It is hard to prove consistency and real skill as a junior developer when experience cannot be claimed and most learning happens off-screen.',
      approach: 'Committed to building clones, components, and small tools in the open — turning every repository into visible proof of steady practice rather than unverifiable claims.',
      tools: ['HTML5', 'CSS3', 'JavaScript', 'VS Code', 'Git', 'GitHub'],
    },
  };

  const panel = overlay.querySelector('.debrief-panel');
  const elId = document.getElementById('debrief-id');
  const elTitle = document.getElementById('debrief-title');
  const elSub = document.getElementById('debrief-subtitle');
  const elProblem = document.getElementById('debrief-problem');
  const elApproach = document.getElementById('debrief-approach');
  const elTools = document.getElementById('debrief-tools');

  let lastFocused = null;

  const fill = (d) => {
    elId.textContent = d.id;
    elTitle.textContent = d.title;
    elSub.textContent = d.subtitle;
    elProblem.textContent = d.problem;
    elApproach.textContent = d.approach;
    elTools.replaceChildren();
    d.tools.forEach(t => {
      const li = document.createElement('li');
      li.textContent = t;
      elTools.appendChild(li);
    });
  };

  const open = (key) => {
    const d = DATA[key];
    if (!d) return;
    fill(d);
    lastFocused = document.activeElement;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';   // lock the page behind the panel
    panel.scrollTop = 0;
    panel.focus();
  };

  const close = () => {
    if (!overlay.classList.contains('is-open')) return;
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  };

  // Open triggers — every "Case Study" button.
  document.querySelectorAll('.project-debrief-btn').forEach(btn => {
    btn.addEventListener('click', () => open(btn.dataset.debrief));
  });

  // Close triggers — backdrop + close button (anything tagged data-debrief-close).
  overlay.querySelectorAll('[data-debrief-close]').forEach(el => {
    el.addEventListener('click', close);
  });

  // Keyboard: ESC closes; Tab stays trapped inside the open panel.
  document.addEventListener('keydown', (e) => {
    if (!overlay.classList.contains('is-open')) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key === 'Tab') {
      const focusables = panel.querySelectorAll(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    }
  });
})();
