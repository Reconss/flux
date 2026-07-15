// === TIME TOOLS ===
function updateTimeTools() {
  const now = Date.now();
  const date = new Date();
  document.getElementById('currentTimestamp').textContent = now;
  document.getElementById('currentDatetime').textContent = date.toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
}

// URL 编码
const encIn = document.getElementById('urlEncodeInput');
const encOut = document.getElementById('urlEncodeOutput');
if (encIn) encIn.addEventListener('input', e => {
  const v = e.target.value;
  try { encOut.textContent = v ? encodeURIComponent(v) : ''; }
  catch { encOut.textContent = '编码失败'; }
});

// URL 解码
const decIn = document.getElementById('urlDecodeInput');
const decOut = document.getElementById('urlDecodeOutput');
if (decIn) decIn.addEventListener('input', e => {
  const v = e.target.value;
  try { decOut.textContent = v ? decodeURIComponent(v) : ''; }
  catch { decOut.textContent = '解码失败'; }
});

// Base64
const b64In = document.getElementById('base64Input');
const b64Out = document.getElementById('base64Output');
if (b64In) b64In.addEventListener('input', e => {
  const v = e.target.value;
  try { b64Out.textContent = v ? btoa(unescape(encodeURIComponent(v))) : ''; }
  catch { b64Out.textContent = '编码失败'; }
});

updateTimeTools();
setInterval(updateTimeTools, 1000);

// === DATA ===
const DATA_URL = './data/all_bookmarks.json';
const accent = '#6366F1';

// single-hue palette — derive from accent, never rainbow
const hueSteps = [
  { bg: '#EEF2FF', fg: '#6366F1' },  // indigo-50 / indigo-500
  { bg: '#E8E5FF', fg: '#7C3AED' },  // violet-50 / violet-600
  { bg: '#F0FDF4', fg: '#16A34A' },  // green-50 / green-600
  { bg: '#FFF7ED', fg: '#EA580C' },  // orange-50 / orange-600
  { bg: '#FEF2F2', fg: '#DC2626' },  // red-50 / red-600
  { bg: '#F0F9FF', fg: '#0284C7' },  // sky-50 / sky-600
];

function pickHue(name) {
  return hueSteps[name.charCodeAt(0) % hueSteps.length];
}

function renderRating(rating) {
  const n = Math.min(rating || 3, 5);
  return '★'.repeat(n) + '<span class="star empty">' + '★'.repeat(5 - n) + '</span>';
}

function getCategoryIcon(cat) {
  const icons = {
    all: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
    developer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>',
    entertainment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="15" rx="2"/><path d="M17 2l-5 5-5-5"/></svg>',
    tools: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
    learning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>'
  };
  return icons[cat] || icons.all;
}

const categoryLabel = {
  developer: '开发',
  entertainment: '娱乐',
  tools: '工具',
  learning: '学习'
};

function renderCategories(data) {
  const nav = document.getElementById('categoryNav');
  let total = 0;
  let html = '';

  for (const [key, sites] of Object.entries(data)) total += sites.length;

  html += `<button class="category-btn active" data-category="all">
    ${getCategoryIcon('all')}<span>全部</span><span class="count">${total}</span></button>`;

  for (const [key, sites] of Object.entries(data)) {
    const label = categoryLabel[key] || key;
    html += `<button class="category-btn" data-category="${key}">
      ${getCategoryIcon(key)}<span>${label}</span><span class="count">${sites.length}</span></button>`;
  }

  nav.innerHTML = html;
}

function renderSites(sites) {
  const grid = document.getElementById('sitesGrid');
  const empty = document.getElementById('emptyState');
  const countEl = document.getElementById('searchCount');

  if (countEl) countEl.textContent = `共 ${sites.length} 个网站`;

  if (sites.length === 0) {
    grid.innerHTML = '';
    empty.hidden = false;
    return;
  }

  empty.hidden = true;

  // batch DOM — innerHTML once
  grid.innerHTML = sites.map((site, i) => {
    const hue = pickHue(site.name);
    const tagHtml = site.tags
      ? site.tags.slice(0, 3).map(t => `<span class="card-tag">${t}</span>`).join('')
      : '';
    return `<a href="${site.url}" target="_blank" rel="noopener noreferrer"
      class="site-card" style="animation-delay:${i * 35}ms">
      <div class="card-header">
        <div class="card-icon" style="background:${hue.bg};color:${hue.fg}">${site.name.charAt(0)}</div>
        <div class="card-info">
          <div class="card-title">${site.name}</div>
          <div class="card-meta">
            <div class="card-rating">${renderRating(site.rating)}</div>
            ${site.language ? `<span class="card-lang">${site.language}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="card-desc">${site.description || '暂无描述'}</div>
      <div class="card-footer">
        ${tagHtml ? `<div class="card-tags">${tagHtml}</div>` : '<div></div>'}
        <div class="card-action">访问<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>
      </div>
    </a>`;
  }).join('');
}

function filterSites(data, category, query) {
  let sites = [];
  if (category === 'all') {
    for (const arr of Object.values(data)) sites.push(...arr);
  } else {
    sites = data[category] || [];
  }

  if (query) {
    const q = query.toLowerCase();
    sites = sites.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.description && s.description.toLowerCase().includes(q)) ||
      (s.tags && s.tags.some(t => t.toLowerCase().includes(q)))
    );
  }
  return sites;
}

// === INIT ===
let allData = {};
let currentCategory = 'all';
let currentQuery = '';

async function init() {
  try {
    allData = await (await fetch(DATA_URL)).json();
    renderCategories(allData);
    renderSites(filterSites(allData, 'all', ''));

    // category nav
    document.getElementById('categoryNav').addEventListener('click', e => {
      const btn = e.target.closest('.category-btn');
      if (!btn) return;
      document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category;
      renderSites(filterSites(allData, currentCategory, currentQuery));
    });

    // search
    document.getElementById('searchInput').addEventListener('input', e => {
      currentQuery = e.target.value;
      renderSites(filterSites(allData, currentCategory, currentQuery));
    });

    // ⌘K
    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
      }
    });

    // theme toggle
    const themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
      });
    }
    if (localStorage.getItem('theme') === 'dark') document.body.classList.add('dark');

  } catch (err) {
    console.error('Failed to load data:', err);
    document.getElementById('sitesGrid').innerHTML =
      '<p style="text-align:center;color:var(--ink-3);grid-column:1/-1;padding:4rem">数据加载失败，请刷新页面</p>';
  }
}

init();
