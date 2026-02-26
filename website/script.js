/* ═══════════════════════════════════════════════════════════════════
   WatchX Showcase — Interactive Scripts
   ═══════════════════════════════════════════════════════════════════ */

// ── Navbar scroll effect ──────────────────────────────────────────
const navbar = document.getElementById('navbar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const y = window.scrollY;
  if (y > 60) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
  lastScroll = y;
}, { passive: true });


// ── Scroll reveal (IntersectionObserver) ──────────────────────────
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
);

document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
  revealObserver.observe(el);
});


// ── Counter animation ─────────────────────────────────────────────
const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.5 }
);

document.querySelectorAll('.counter').forEach((el) => {
  counterObserver.observe(el);
});

function animateCounter(el) {
  const target = parseInt(el.getAttribute('data-target'), 10);
  const suffix = el.getAttribute('data-suffix') || '';

  if (isNaN(target) || target === 0) return;

  const duration = 1500;
  const start = performance.now();

  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(eased * target);
    el.textContent = value + suffix;

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}


// ── Hero chart animation ──────────────────────────────────────────
function generateChartPath() {
  const points = [];
  const width = 500;
  const height = 120;
  const segments = 25;

  for (let i = 0; i <= segments; i++) {
    const x = (i / segments) * width;
    const base = 30 + Math.sin(i * 0.5 + Date.now() * 0.001) * 25;
    const noise = Math.random() * 15 - 7.5;
    const y = Math.max(10, Math.min(height - 10, base + noise));
    points.push({ x, y });
  }

  // Smooth SVG path
  let linePath = `M${points[0].x},${points[0].y}`;
  let areaPath = linePath;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    linePath += ` C${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
    areaPath += ` C${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
  }

  areaPath += ` V${height} H0 Z`;

  return { linePath, areaPath, lastPoint: points[points.length - 1] };
}

function updateHeroChart() {
  const chartLine = document.getElementById('chart-line');
  const chartArea = document.getElementById('chart-area');
  const chartDot = document.getElementById('chart-dot');

  if (!chartLine) return;

  const { linePath, areaPath, lastPoint } = generateChartPath();
  chartLine.setAttribute('d', linePath);
  chartArea.setAttribute('d', areaPath);
  chartDot.setAttribute('cx', lastPoint.x);
  chartDot.setAttribute('cy', lastPoint.y);
}

// Initial + interval
updateHeroChart();
setInterval(updateHeroChart, 2000);


// ── Dashboard showcase tabs ───────────────────────────────────────
const showcaseTabs = document.querySelectorAll('.showcase-tab');
const showcasePanels = document.querySelectorAll('.showcase-panel');

showcaseTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const target = tab.getAttribute('data-tab');

    // Update tab active states
    showcaseTabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');

    // Update panel visibility
    showcasePanels.forEach((panel) => {
      if (panel.getAttribute('data-panel') === target) {
        panel.classList.add('active');
        // Re-trigger animation
        panel.style.animation = 'none';
        panel.offsetHeight; // force reflow
        panel.style.animation = '';
      } else {
        panel.classList.remove('active');
      }
    });
  });
});


// ── Copy code button ──────────────────────────────────────────────
function copyCode(button) {
  const codeBlock = button.closest('.code-block');
  const code = codeBlock.querySelector('.code-content code');
  const text = code.innerText || code.textContent;

  navigator.clipboard.writeText(text).then(() => {
    const original = button.textContent;
    button.textContent = 'Copied!';
    button.style.color = '#6366f1';
    setTimeout(() => {
      button.textContent = original;
      button.style.color = '';
    }, 2000);
  });
}


// ── Smooth anchor scrolling (offset for fixed nav) ────────────────
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (e) => {
    const href = anchor.getAttribute('href');
    if (href === '#') return;

    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});


// ── Parallax effect for hero background blobs ─────────────────────
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      const scroll = window.scrollY;
      const blobs = document.querySelectorAll('.animate-pulse-slow');
      blobs.forEach((blob, i) => {
        const speed = 0.03 + i * 0.01;
        blob.style.transform = `translateY(${scroll * speed}px)`;
      });
      ticking = false;
    });
    ticking = true;
  }
}, { passive: true });


// ── Log lines auto-scroll effect in showcase ──────────────────────
const logPanel = document.querySelector('[data-panel="logs"]');
if (logPanel) {
  const logContainer = logPanel.querySelector('.bg-gray-950');
  if (logContainer) {
    setInterval(() => {
      if (logContainer.scrollTop < logContainer.scrollHeight - logContainer.clientHeight) {
        logContainer.scrollTop += 1;
      }
    }, 100);
  }
}


// ── Typewriter effect for hero badge (subtle) ─────────────────────
// Already static for performance/accessibility. Add more effects sparingly.


// ── Preloader (hide once content is ready) ────────────────────────
window.addEventListener('load', () => {
  document.body.style.opacity = '1';
});

// Ensure body is visible even without images
document.body.style.opacity = '1';

console.log(
  '%c WatchX %c Showcase Website Loaded ',
  'background: #6366f1; color: white; font-weight: bold; padding: 2px 8px; border-radius: 4px 0 0 4px;',
  'background: #1e1b4b; color: #a5b4fc; font-weight: bold; padding: 2px 8px; border-radius: 0 4px 4px 0;'
);
