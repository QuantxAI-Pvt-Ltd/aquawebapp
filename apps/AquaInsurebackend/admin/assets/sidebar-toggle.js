// ── Inject OCR Excel Export link after Insurance Management ──────────────────
const injectOcrLink = () => {
  // Don't inject on login page
  if (window.location.pathname.includes('/login')) return;

  // If already injected and still in DOM, just update active state
  const existing = document.getElementById('aqua-ocr-nav-link');
  if (existing) {
    const isActive = window.location.pathname.includes('/pages/ocr-export');
    existing.style.fontWeight = isActive ? '700' : 'normal';
    existing.style.color = isActive ? '#006876' : '';
    return;
  }

  // Find Insurance Management nav link
  const allLinks = Array.from(document.querySelectorAll('nav a'));
  const insuranceLink = allLinks.find(a => 
    a.href && (a.href.includes('/resources/Insurance') || (a.textContent || '').trim() === 'Insurance Management')
  );
  if (!insuranceLink) return;

  // Clone it and adapt
  const ocrLink = insuranceLink.cloneNode(true);
  ocrLink.id = 'aqua-ocr-nav-link';
  ocrLink.href = '/pages/ocr-export';
  ocrLink.removeAttribute('aria-current');
  ocrLink.removeAttribute('data-selected');

  // Find text node and update it
  const allSpans = ocrLink.querySelectorAll('*');
  let textUpdated = false;
  allSpans.forEach(el => {
    if (!textUpdated && el.children.length === 0 && el.textContent.trim()) {
      el.textContent = 'OCR Excel Export';
      textUpdated = true;
    }
  });
  if (!textUpdated) ocrLink.textContent = 'OCR Excel Export';

  // Highlight if active
  if (window.location.pathname.includes('/pages/ocr-export')) {
    ocrLink.style.fontWeight = '700';
    ocrLink.style.color = '#006876';
  }

  // Insert after insurance link
  if (insuranceLink.nextSibling) {
    insuranceLink.parentNode.insertBefore(ocrLink, insuranceLink.nextSibling);
  } else {
    insuranceLink.parentNode.appendChild(ocrLink);
  }
};

// ── Sidebar Toggle Button ───────────────────────────────────────────────────
const initToggleBtn = () => {
  const path = window.location.pathname;
  const isResourcePage = path.includes('/resources/') || path.includes('/pages/');
  if (!isResourcePage) {
    const existing = document.getElementById('aqua-sidebar-toggle');
    if (existing) existing.remove();
    return;
  }
  if (document.getElementById('aqua-sidebar-toggle')) return;

  const btn = document.createElement('div');
  btn.id = 'aqua-sidebar-toggle';
  btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:20px;color:#fff">menu_open</span>`;
  btn.style.cssText = `
    position:fixed; bottom:20px; left:20px; z-index:9999;
    background:#006876; border-radius:50%; width:40px; height:40px;
    display:flex; align-items:center; justify-content:center;
    cursor:pointer; box-shadow:0 8px 24px rgba(0,0,0,0.5);
    transition:transform 0.2s,background 0.2s;
  `;
  btn.onmouseover = () => btn.style.background = '#1fc4dc';
  btn.onmouseout = () => btn.style.background = '#006876';
  btn.onclick = () => {
    document.body.classList.toggle('sidebar-collapsed');
    const span = btn.querySelector('span');
    const collapsed = document.body.classList.contains('sidebar-collapsed');
    span.textContent = collapsed ? 'menu' : 'menu_open';
    btn.style.transform = collapsed ? 'rotate(180deg)' : 'rotate(0deg)';
  };
  document.body.appendChild(btn);
};

// ── Run with retry loop (Insurance link may not exist yet) ──────────────────
let attempts = 0;
const runLoop = setInterval(() => {
  injectOcrLink();
  initToggleBtn();
  attempts++;
  if (attempts > 30) clearInterval(runLoop); // stop after 30 attempts (~15s)
}, 500);

// ── Re-run on SPA navigation ─────────────────────────────────────────────────
const _origPushState = history.pushState;
history.pushState = function (...args) {
  _origPushState.apply(this, args);
  // Remove injected link so it gets re-evaluated for active state on next interval
  const existing = document.getElementById('aqua-ocr-nav-link');
  if (existing) existing.remove();
  const toggleExisting = document.getElementById('aqua-sidebar-toggle');
  if (toggleExisting) toggleExisting.remove();
  attempts = 0; // reset retry counter
};
window.addEventListener('popstate', () => {
  const existing = document.getElementById('aqua-ocr-nav-link');
  if (existing) existing.remove();
  attempts = 0;
});
