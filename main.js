// ════════════════════════════════════════════════════════
// FLUX · main.js — 应用逻辑
// ════════════════════════════════════════════════════════

// ── STATE ──────────────────────────────────────────────
let state = { cat: 'all', view: 'grid', query: '' };
const catTagState = {};
let favorites = new Set(JSON.parse(localStorage.getItem('navhub-favs') || '[]'));
let showingFavs = false;

// ── FAVORITES ──────────────────────────────────────────
function toggleFav(e, url) {
  e.preventDefault(); e.stopPropagation();
  favorites.has(url) ? favorites.delete(url) : favorites.add(url);
  localStorage.setItem('navhub-favs', JSON.stringify([...favorites]));
  updateCounts();
  render();
}

function toggleFavorites() {
  showingFavs = !showingFavs;
  if (showingFavs) {
    state.cat = 'fav';
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.cat === 'fav'));
  }
  render();
}

// ── EDITOR ─────────────────────────────────────────────
let editingUrl = null;

function toggleEditor() {
  const m = document.getElementById('editorModal');
  m.classList.toggle('open');
  if (m.classList.contains('open')) {
    const sel = document.getElementById('editCat');
    sel.innerHTML = Object.entries(CATS).map(([k, v]) =>
      `<option value="${k}">${v.icon} ${v.label}</option>`).join('');
  }
}

function addSite() {
  const name  = document.getElementById('editName').value.trim();
  let   url   = document.getElementById('editUrl').value.trim();
  const cat   = document.getElementById('editCat').value;
  const desc  = document.getElementById('editDesc').value.trim();
  const tags  = document.getElementById('editTags').value.split(',').map(t => t.trim()).filter(Boolean);
  const badge = document.getElementById('editBadge').value;
  if (!name || !url) { alert('名称和网址不能为空'); return; }
  if (!url.match(/^https?:\/\//)) url = 'https://' + url;
  SITES.push({ cat, name, url, desc, tags, badge });
  localStorage.setItem('navhub-sites', JSON.stringify(SITES));
  clearEditor(); updateCounts(); render();
  alert('添加成功！');
}

function saveSite() {
  if (!editingUrl) { alert('请先点击列表中的站点进行编辑'); return; }
  const name  = document.getElementById('editName').value.trim();
  const url   = document.getElementById('editUrl').value.trim();
  const cat   = document.getElementById('editCat').value;
  const desc  = document.getElementById('editDesc').value.trim();
  const tags  = document.getElementById('editTags').value.split(',').map(t => t.trim()).filter(Boolean);
  const badge = document.getElementById('editBadge').value;
  const idx = SITES.findIndex(s => s.url === editingUrl);
  if (idx !== -1 && name && url) {
    SITES[idx] = { cat, name, url, desc, tags, badge };
    localStorage.setItem('navhub-sites', JSON.stringify(SITES));
    editingUrl = null; clearEditor(); updateCounts(); render();
    alert('保存成功！');
  }
}

function deleteSite() {
  if (!editingUrl) { alert('请先点击列表中的站点进行编辑'); return; }
  if (!confirm('确定删除这个站点？')) return;
  const idx = SITES.findIndex(s => s.url === editingUrl);
  if (idx !== -1) {
    SITES.splice(idx, 1);
    localStorage.setItem('navhub-sites', JSON.stringify(SITES));
    editingUrl = null; clearEditor(); updateCounts(); render();
    alert('删除成功！');
  }
}

function clearEditor() {
  ['editName','editUrl','editDesc','editTags'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('editBadge').value = '';
  editingUrl = null;
}

function exportData() {
  const blob = new Blob([JSON.stringify({ sites: SITES, favorites: [...favorites] }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'flux-backup.json';
  a.click();
}

function importData(input) {
  const f = input.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.sites && Array.isArray(data.sites)) {
        SITES.splice(0, SITES.length, ...data.sites);
        localStorage.setItem('navhub-sites', JSON.stringify(SITES));
      }
      if (data.favorites && Array.isArray(data.favorites)) {
        favorites = new Set(data.favorites);
        localStorage.setItem('navhub-favs', JSON.stringify([...favorites]));
      }
      updateCounts(); render();
      alert('导入成功！');
    } catch (err) { alert('导入失败，请检查文件格式'); }
  };
  r.readAsText(f);
}

// ── THEME ──────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeBtn');
  if (btn) btn.querySelector('.sfoot-icon').textContent = theme === 'dark' ? '🌙' : '☀️';
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('navhub-theme', next);
}

// ── COUNTS ─────────────────────────────────────────────
function updateCounts() {
  document.getElementById('totalNum').textContent = SITES.length;
  const ff = document.getElementById('favCountFoot');
  if (ff) ff.textContent = favorites.size;
  document.getElementById('nc-all').textContent = SITES.length;
  document.getElementById('nc-fav').textContent = favorites.size;
  Object.keys(CATS).forEach(c => {
    const el = document.getElementById('nc-' + c);
    if (el) el.textContent = SITES.filter(s => s.cat === c).length;
  });
}

// ── NAV & SEARCH & VIEW ────────────────────────────────
function setNav(el) {
  event.preventDefault();
  state.cat = el.dataset.cat;
  state.query = '';
  document.getElementById('searchInput').value = '';
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  el.classList.add('active');
  if (activeScenario !== null) { activeScenario = null; renderHeroScenarios(); }
  render(); syncURL();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function doSearch(v) {
  state.query = v;
  state.cat = 'all';
  if (activeScenario !== null) { activeScenario = null; renderHeroScenarios(); }
  document.querySelectorAll('.nav-item').forEach((n, i) => n.classList.toggle('active', i === 0));
  render(); syncURL();
}

function setView(v) {
  state.view = v;
  document.getElementById('vgrid').classList.toggle('active', v === 'grid');
  document.getElementById('vlist').classList.toggle('active', v === 'list');
  localStorage.setItem('navhub-view', v);
  render(); syncURL();
}

// ── SCROLL TO TOP ──────────────────────────────────────
function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
window.addEventListener('scroll', () => {
  document.getElementById('backToTop').classList.toggle('visible', window.scrollY > 300);
});

// ── URL ROUTING ────────────────────────────────────────
function syncURL() {
  const p = new URLSearchParams();
  if (state.cat !== 'all') p.set('cat', state.cat);
  if (state.query) p.set('q', state.query);
  if (state.view !== 'grid') p.set('view', state.view);
  const qs = p.toString();
  history.replaceState(null, '', qs ? '?' + qs : location.pathname);
}

function loadFromURL() {
  const p = new URLSearchParams(location.search);
  if (p.get('cat') && CATS[p.get('cat')]) state.cat = p.get('cat');
  if (p.get('q')) { state.query = p.get('q'); document.getElementById('searchInput').value = state.query; }
  if (p.get('view')) state.view = p.get('view');
}

// ── COLLAPSE ───────────────────────────────────────────
function toggleSection(cat) {
  const sec = document.getElementById('sec-' + cat);
  if (sec) {
    sec.classList.toggle('collapsed');
    localStorage.setItem('navhub-collapse-' + cat, sec.classList.contains('collapsed'));
  }
}

function loadCollapseState() {
  Object.keys(CATS).forEach(cat => {
    const sec = document.getElementById('sec-' + cat);
    if (sec && localStorage.getItem('navhub-collapse-' + cat) === 'true') sec.classList.add('collapsed');
  });
}

// ── TAG FILTER ─────────────────────────────────────────
function setCatTag(cat, tag) {
  catTagState[cat] = catTagState[cat] === tag ? '' : tag;
  const sec = document.getElementById('sec-' + cat);
  if (sec) sec.querySelectorAll('.stag').forEach(b => b.classList.toggle('active', b.dataset.tag === catTagState[cat]));
  renderSectionCards(cat);
}

// ── HELPERS ────────────────────────────────────────────
const BADGE_CFG = {
  hot:  ['b-hot',  'HOT'],
  new:  ['b-new',  'NEW'],
  free: ['b-free', 'FREE'],
  cn:   ['b-cn',   '中文'],
  open: ['b-open', '开源'],
};

// favicon：优先 DuckDuckGo（国内可用），失败后展示首字母头像
const _faviconCache = {};
function faviconUrl(url) {
  try {
    const host = new URL(url).hostname;
    return `https://${host}/favicon.ico`;
  } catch { return ''; }
}

// 首字母 fallback 头像（canvas-free，纯 CSS + 文字）
function faviconFallback(name, el) {
  const char  = (name || '?')[0].toUpperCase();
  const colors = ['#6c8aff','#a78bfa','#34d399','#fb923c','#f472b6','#38bdf8','#facc15'];
  const bg    = colors[char.charCodeAt(0) % colors.length];
  el.style.background = bg;
  el.style.display    = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.fontSize   = '14px';
  el.style.fontWeight = '700';
  el.style.color      = '#fff';
  el.style.fontFamily = 'var(--sans)';
  el.innerHTML        = char;
}
function hostOf(url) {
  try { return new URL(url).hostname; } catch { return url; }
}

function buildCard(s) {
  const ico    = faviconUrl(s.url);
  const badge  = s.badge && BADGE_CFG[s.badge] ? `<span class="card-badge ${BADGE_CFG[s.badge][0]}">${BADGE_CFG[s.badge][1]}</span>` : '';
  const tagHtml= s.tags?.length ? s.tags.map(t => `<span class="ctag">${t}</span>`).join('') : '';
  const isFav  = favorites.has(s.url);
  const favBtn = `<button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFav(event,'${s.url}')" title="${isFav ? '取消收藏' : '收藏'}">${isFav ? '★' : '☆'}</button>`;
  const name_esc = s.name.replace(/'/g, "\\'");
  return `<a class="card" href="${s.url}" target="_blank" rel="noopener">
    <div class="card-top">
      <div class="card-ico" id="ico-${btoa(s.url).replace(/[^a-zA-Z0-9]/g,'')}">
        ${ico ? `<img src="${ico}" alt="" loading="lazy"
          onerror="faviconFallback('${name_esc}',this.parentNode)">` : ''}
      </div>
      <div class="card-meta">
        <div class="card-name">${s.name}</div>
        <div class="card-host">${hostOf(s.url)}</div>
        <div class="card-tags-row">${tagHtml}</div>
      </div>
      ${badge}${favBtn}
    </div>
    <div class="card-desc">${s.desc || ''}</div>
  </a>`;
}

function getTagsForCat(cat) {
  const seen = new Set(), out = [];
  SITES.filter(s => s.cat === cat).forEach(s => (s.tags || []).forEach(t => { if (!seen.has(t)) { seen.add(t); out.push(t); } }));
  return out;
}

function renderSectionCards(cat) {
  const el = document.getElementById('cards-' + cat);
  if (!el) return;
  const at = catTagState[cat] || '';
  const items = SITES.filter(s => s.cat === cat && (!at || (s.tags || []).includes(at)));
  el.className = `cards${state.view === 'list' ? ' list-view' : ''}`;
  el.innerHTML = items.length ? items.map(buildCard).join('') : '<div class="empty">该标签下暂无内容</div>';
}

// ── RENDER ─────────────────────────────────────────────
function render() {
  const content = document.getElementById('content');
  const q  = state.query.toLowerCase();
  const lv = state.view === 'list' ? ' list-view' : '';

  // search
  if (q) {
    const hits = SITES.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.desc || '').toLowerCase().includes(q) ||
      s.url.toLowerCase().includes(q) ||
      (s.tags || []).some(t => t.toLowerCase().includes(q))
    );
    const groups = {};
    hits.forEach(s => { (groups[s.cat] || (groups[s.cat] = [])).push(s); });
    const order = Object.keys(CATS).filter(c => groups[c]);
    if (!order.length) {
      content.innerHTML = `<div class="empty">没有找到"${state.query}"相关内容 🔍<br><small style="margin-top:6px;display:block">试试其他关键词</small></div>`;
      return;
    }
    content.innerHTML = order.map(cat => {
      const m = CATS[cat];
      return `<div class="section ${m.cls}" id="sec-${cat}">
        <div class="sec-hd"><div class="sec-dot"></div><span class="sec-title">${m.icon} ${m.label}</span><span class="sec-count">${groups[cat].length} 个</span></div>
        <div class="cards${lv}">${groups[cat].map(buildCard).join('')}</div>
      </div>`;
    }).join('');
    return;
  }

  // favorites
  if (state.cat === 'fav' || showingFavs) {
    const favItems = SITES.filter(s => favorites.has(s.url));
    content.innerHTML = `<div class="section" id="sec-fav">
      <div class="sec-hd"><div class="sec-dot" style="background:var(--a7)"></div><span class="sec-title">⭐ 我的收藏</span><span class="sec-count">${favItems.length} 个</span></div>
      <div class="cards${lv}">${favItems.length ? favItems.map(buildCard).join('') : '<div class="empty">暂无收藏，点击卡片上的 ☆ 收藏站点</div>'}</div>
    </div>`;
    return;
  }

  // normal
  const cats = state.cat === 'all' ? Object.keys(CATS) : [state.cat];
  content.innerHTML = cats.map(cat => {
    const m = CATS[cat];
    const total = SITES.filter(s => s.cat === cat).length;
    if (!total) return '';
    const tags = getTagsForCat(cat);
    const at   = catTagState[cat] || '';
    const tagPills = tags.length > 1 ? `<div class="sec-tags">
      <button class="stag${!at ? ' active' : ''}" data-tag="" onclick="setCatTag('${cat}','')">全部</button>
      ${tags.map(t => `<button class="stag${at === t ? ' active' : ''}" data-tag="${t}" onclick="setCatTag('${cat}','${t}')">${t}</button>`).join('')}
    </div>` : '';
    const items = SITES.filter(s => s.cat === cat && (!at || (s.tags || []).includes(at)));
    return `<div class="section ${m.cls}" id="sec-${cat}">
      <div class="sec-hd" onclick="toggleSection('${cat}')">
        <div class="sec-dot"></div>
        <span class="sec-title">${m.icon} ${m.label}</span>
        <span class="sec-count">${total} 个</span>
      </div>
      ${tagPills}
      <div class="cards${lv}" id="cards-${cat}">${items.map(buildCard).join('')}</div>
    </div>`;
  }).join('');
}

// ── HERO ───────────────────────────────────────────────
const SCENARIOS = [
  { icon:'✨', label:'今天想用 AI',  sub:'写作·编程·创作',   color:'var(--a1)', bg:'rgba(108,138,255,.1)', action(){ doSearch('AI'); } },
  { icon:'🎬', label:'追剧找资源',  sub:'影视·网盘·字幕',   color:'var(--a5)', bg:'rgba(244,114,182,.1)', action(){ jumpToCat('media'); } },
  { icon:'📥', label:'找软件下载',  sub:'正版·便携·系统',   color:'var(--a6)', bg:'rgba(56,189,248,.1)',  action(){ jumpToCat('dl'); } },
  { icon:'📖', label:'找本书来读',  sub:'电子书·漫画·小说', color:'var(--a3)', bg:'rgba(52,211,153,.1)', action(){ jumpToCat('read'); } },
  { icon:'🎮', label:'打游戏',      sub:'商店·单机·模拟器', color:'var(--a7)', bg:'rgba(250,204,21,.08)', action(){ jumpToCat('game'); } },
  { icon:'🛠', label:'做点实用的',  sub:'设计·图片·PDF',    color:'var(--a4)', bg:'rgba(251,146,60,.1)', action(){ jumpToCat('tools'); } },
];

let activeScenario = null;

function renderHeroScenarios() {
  const el = document.getElementById('heroScenarios');
  if (!el) return;
  el.innerHTML = SCENARIOS.map((s, i) => `
    <button class="scenario-btn${activeScenario === i ? ' active' : ''}"
      style="${activeScenario === i ? `background:${s.bg};border-color:${s.color};color:${s.color}` : ''}"
      onclick="triggerScenario(${i})">
      <span class="scenario-icon">${s.icon}</span>
      <span class="scenario-label">${s.label}<span class="scenario-sub">${s.sub}</span></span>
    </button>`).join('');
}

function triggerScenario(i) {
  if (activeScenario === i) {
    activeScenario = null;
    state.cat = 'all'; state.query = '';
    document.getElementById('searchInput').value = '';
    document.querySelectorAll('.nav-item').forEach((n, idx) => n.classList.toggle('active', idx === 0));
    renderHeroScenarios(); render();
    return;
  }
  activeScenario = i;
  renderHeroScenarios();
  SCENARIOS[i].action();
  window.scrollTo({ top: document.getElementById('content').offsetTop - 60, behavior: 'smooth' });
}

function jumpToCat(catKey) {
  state.cat = catKey; state.query = '';
  document.getElementById('searchInput').value = '';
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.cat === catKey));
  render(); syncURL();
}

// picks
const PICK_POOL = [
  ...SITES.filter(s => s.badge === 'hot'),
  ...SITES.filter(s => s.badge === 'new'),
  ...SITES.filter(s => !s.badge && s.desc),
].filter((s, i, a) => a.findIndex(x => x.url === s.url) === i);

let pickSeed = Date.now();

function seededRandPicks(seed, n) {
  const arr = [...PICK_POOL]; let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor(s / 233280 * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, n);
}

function renderHeroPicks(seed) {
  const el = document.getElementById('heroPicks');
  if (!el) return;
  el.innerHTML = seededRandPicks(seed, 3).map(s => {
    const ico = faviconUrl(s.url);
    const name_esc = s.name.replace(/'/g, "\\'");
    return `<a class="pick-card" href="${s.url}" target="_blank" rel="noopener">
      <div class="pick-ico">
        ${ico ? `<img src="${ico}" alt="" loading="lazy" onerror="faviconFallback('${name_esc}',this.parentNode)">` : ''}
      </div>
      <div class="pick-body">
        <div class="pick-name">${s.name}</div>
        <div class="pick-desc">${s.desc || ''}</div>
      </div>
      <span class="pick-label">精选</span>
    </a>`;
  }).join('');
}

function refreshPicks() { pickSeed = Date.now(); renderHeroPicks(pickSeed); }

function initHero() {
  // sync theme icon
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const btn = document.getElementById('themeBtn');
  if (btn) btn.querySelector('.sfoot-icon').textContent = isDark ? '🌙' : '☀️';
  renderHeroScenarios();
  renderHeroPicks(pickSeed);
}

// ── SYSTEM THEME ──────────────────────────────────────
function initSystemTheme() {
  const saved = localStorage.getItem('navhub-theme');
  if (saved) {
    // user has manually set a preference — respect it
    applyTheme(saved);
  } else {
    // follow OS preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }
  // listen for OS changes (only when no manual pref saved)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('navhub-theme')) {
      applyTheme(e.matches ? 'dark' : 'light');
    }
  });
}

// ── INIT ───────────────────────────────────────────────
(function init() {
  // restore saved sites
  const savedSites = localStorage.getItem('navhub-sites');
  if (savedSites) {
    try { SITES.splice(0, SITES.length, ...JSON.parse(savedSites)); } catch(e) {}
  }
  // restore view
  const savedView = localStorage.getItem('navhub-view');
  if (savedView) state.view = savedView;

  initSystemTheme();
  updateCounts();
  loadFromURL();
  render();
  loadCollapseState();
  initHero();

  // sync view toggle UI
  document.getElementById('vgrid').classList.toggle('active', state.view === 'grid');
  document.getElementById('vlist').classList.toggle('active', state.view === 'list');
})();
