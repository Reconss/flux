// ════════════════════════════════════════════════════════
// FLUX · main.js — 应用逻辑
// ════════════════════════════════════════════════════════

// ── CONFIG (从 config.js 加载) ──
const _CATS_FROM_CONFIG = (typeof CONFIG !== 'undefined' && CONFIG.cats) ? CONFIG.cats : null;

// ── APPLY CONFIG (合并 cat/tags/name) ──
function applyConfig() {
  if (typeof CONFIG === 'undefined') return;
  SITES.forEach(s => {
    // 0. 站点自带 cat（如 afx 集成数据）直接保留，跳过规则匹配
    if (s.cat) { s.tags = s.tags || []; return; }
    // 1. sites 精确覆盖（最高优先级）
    if (CONFIG.sites && CONFIG.sites[s.url]) {
      const ov = CONFIG.sites[s.url];
      s.cat  = ov.cat;
      s.tags = ov.tags || [];
      if (ov.name) s.name = ov.name;
      return;
    }
    // 2. rules 域名匹配
    let rule = null;
    try {
      const host = new URL(s.url).hostname.toLowerCase().replace(/^www\./, '');
      const parts = host.split('.');
      const tld1 = parts[parts.length - 1];
      const tld2 = parts.slice(-2).join('.');
      if (CONFIG.rules) {
        for (const r of CONFIG.rules) {
          if (r.domain === tld1 || r.domain === tld2 || host === r.domain || host.endsWith('.' + r.domain)) {
            rule = r; break;
          }
        }
      }
    } catch (e) {}
    if (rule) { s.cat = rule.cat; s.tags = rule.tag ? [rule.tag] : []; return; }
    // 3. 默认归类
    s.cat  = (CONFIG.default && CONFIG.default.cat)  || 'tools';
    s.tags = (CONFIG.default && CONFIG.default.tags) || [];
  });
}
applyConfig();
// 智能子标签增强（不覆盖已有 tag，仅添加）
SITES.forEach(s => enrichTags(s));

// ── URL 地址信息 badge（国别+协议） ──
const TLD_MAP = {
  cn:'🇨🇳 CN', 'com.cn':'🇨🇳 CN', 'net.cn':'🇨🇳 CN', 'org.cn':'🇨🇳 CN', 'gov.cn':'🇨🇳 CN',
  jp:'🇯🇵 JP', 'co.jp':'🇯🇵 JP', kr:'🇰🇷 KR', tw:'🇹🇼 TW', hk:'🇭🇰 HK',
  uk:'🇬🇧 UK', 'co.uk':'🇬🇧 UK', de:'🇩🇪 DE', fr:'🇫🇷 FR', it:'🇮🇹 IT', es:'🇪🇸 ES',
  ru:'🇷🇺 RU', in:'🇮🇳 IN', sg:'🇸🇬 SG', au:'🇦🇺 AU', ca:'🇨🇦 CA', br:'🇧🇷 BR',
  io:'🌐 IO', ai:'🌐 AI', co:'🌐 CO', me:'🌐 ME', tv:'🌐 TV', xyz:'🌐 XYZ', top:'🌐 TOP',
};
function getUrlBadges(url) {
  if (!url) return [];
  const badges = [];
  try {
    const u = new URL(url);
    if (u.protocol === 'https:') badges.push('🔒');
    else if (u.protocol === 'http:') badges.push('⚠');
    const host = u.hostname.toLowerCase();
    const parts = host.split('.');
    if (parts.length >= 2) {
      const tld1 = parts[parts.length-1], tld2 = parts.slice(-2).join('.');
      if (TLD_MAP[tld2]) badges.push(TLD_MAP[tld2]);
      else if (TLD_MAP[tld1]) badges.push(TLD_MAP[tld1]);
    }
  } catch (e) {}
  return badges;
}

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

let editorLastFocus = null;

function toggleEditor(trigger) {
  const m = document.getElementById('editorModal');
  const willOpen = !m.classList.contains('open');
  m.classList.toggle('open');
  if (willOpen) {
    editorLastFocus = trigger || document.activeElement;
    document.body.classList.add('modal-open');
    const sel = document.getElementById('editCat');
    sel.innerHTML = Object.entries(CATS).map(([k, v]) =>
      `<option value="${k}">${v.icon} ${v.label}</option>`).join('');
    const first = document.getElementById('editName');
    if (first) setTimeout(() => first.focus(), 60);
  } else {
    document.body.classList.remove('modal-open');
    if (editorLastFocus && editorLastFocus.focus) editorLastFocus.focus();
    editorLastFocus = null;
  }
}

function closeEditor() {
  const m = document.getElementById('editorModal');
  if (!m.classList.contains('open')) return;
  m.classList.remove('open');
  document.body.classList.remove('modal-open');
  if (editorLastFocus && editorLastFocus.focus) editorLastFocus.focus();
  editorLastFocus = null;
}

// 点击遮罩关闭 + ESC 关闭 + Tab 焦点陷阱
(function bindEditorChrome() {
  const m = document.getElementById('editorModal');
  if (!m) return;
  m.addEventListener('click', e => { if (e.target === e.currentTarget) closeEditor(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (m.classList.contains('open')) closeEditor(); return; }
    if (e.key !== 'Tab' || !m.classList.contains('open')) return;
    const box = m.querySelector('.editor-box');
    const f = box.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea,[tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
})();

function addSite() {
  const name  = document.getElementById('editName').value.trim();
  let   url   = document.getElementById('editUrl').value.trim();
  const cat   = document.getElementById('editCat').value;
  const desc  = document.getElementById('editDesc').value.trim();
  const tags  = document.getElementById('editTags').value.split(',').map(t => t.trim()).filter(Boolean);
  const badge = document.getElementById('editBadge').value;
  if (!name || !url) { toast('名称和网址不能为空', 'err'); return; }
  if (!url.match(/^https?:\/\//)) url = 'https://' + url;
  SITES.push({ cat, name, url, desc, tags, badge });
  localStorage.setItem('navhub-sites', JSON.stringify(SITES));
  clearEditor(); updateCounts(); render();
  toast('添加成功！', 'ok');
}

function saveSite() {
  if (!editingUrl) { toast('请先点击列表中的站点进行编辑', 'err'); return; }
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
    toast('保存成功！', 'ok');
  }
}

function deleteSite() {
  if (!editingUrl) { toast('请先点击列表中的站点进行编辑', 'err'); return; }
  if (!confirm('确定删除这个站点？')) return;
  const idx = SITES.findIndex(s => s.url === editingUrl);
  if (idx !== -1) {
    SITES.splice(idx, 1);
    localStorage.setItem('navhub-sites', JSON.stringify(SITES));
    editingUrl = null; clearEditor(); updateCounts(); render();
    toast('删除成功！', 'ok');
  }
}

function clearEditor() {
  ['editName','editUrl','editDesc','editTags'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('editBadge').value = '';
  editingUrl = null;
}

// ── TOAST（非阻塞轻提示，替代 alert） ──
function toast(msg, type = 'info') {
  const wrap = document.getElementById('toastWrap');
  if (!wrap) return;
  const icon = type === 'ok' ? '✅' : type === 'err' ? '⚠️' : '💡';
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.setAttribute('role', 'status');
  el.innerHTML = `<span class="t-ico">${icon}</span><span>${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 240);
  }, 2200);
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
      toast('导入成功！', 'ok');
    } catch (err) { toast('导入失败，请检查文件格式', 'err'); }
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
  const cf = document.getElementById('catCountFoot');
  if (cf) cf.textContent = Object.keys(CATS).length;
  document.getElementById('nc-all').textContent = SITES.length;
  document.getElementById('nc-fav').textContent = favorites.size;
  Object.keys(CATS).forEach(c => {
    const el = document.getElementById('nc-' + c);
    if (el) el.textContent = SITES.filter(s => s.cat === c).length;
  });
}

// ── NAV & SEARCH & VIEW ────────────────────────────────
// 跳转到指定分类区块（顶栏下方留出 sticky 标题的间距）
function scrollToSection(cat) {
  const target = (cat && cat !== 'all' && document.getElementById('sec-' + cat))
              || document.getElementById('content');
  if (!target) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  const top = target.getBoundingClientRect().top + window.scrollY - 72;
  window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
}

function setNav(e, el) {
  if (e) e.preventDefault();
  state.cat = el.dataset.cat;
  state.query = '';
  document.getElementById('searchInput').value = '';
  const sw = document.querySelector('.search-wrap'); if (sw) sw.classList.remove('has-value');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  el.classList.add('active');
  if (activeScenario !== null) { activeScenario = null; renderHeroScenarios(); }
  render(); syncURL();
  scrollToSection(state.cat);
}

function doSearch(v) {
  state.query = v;
  state.cat = 'all';
  const sw = document.querySelector('.search-wrap');
  if (sw) sw.classList.toggle('has-value', !!v);
  if (activeScenario !== null) { activeScenario = null; renderHeroScenarios(); }
  document.querySelectorAll('.nav-item').forEach((n, i) => n.classList.toggle('active', i === 0));
  render(); syncURL();
}

// 搜索：防抖动 + 清除 + 快捷键
let _searchTimer = null;
function onSearchInput(v) {
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(() => doSearch(v), 120);
}
function clearSearch() {
  const inp = document.getElementById('searchInput');
  inp.value = '';
  const sw = document.querySelector('.search-wrap');
  if (sw) sw.classList.remove('has-value');
  doSearch('');
  inp.focus();
}
// 全局快捷键 "/" 聚焦搜索
document.addEventListener('keydown', e => {
  if (e.key === '/' && document.activeElement !== document.getElementById('searchInput')) {
    const m = document.getElementById('editorModal');
    if (m && m.classList.contains('open')) return;
    e.preventDefault();
    document.getElementById('searchInput').focus();
  }
});

function setView(v) {
  state.view = v;
  ['vgrid','sgrid'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.toggle('active', v === 'grid'); });
  ['vlist','slist'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.toggle('active', v === 'list'); });
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
    const collapsed = sec.classList.toggle('collapsed');
    localStorage.setItem('navhub-collapse-' + cat, collapsed);
    const hd = sec.querySelector('.sec-hd');
    if (hd) hd.setAttribute('aria-expanded', !collapsed);
  }
}

function loadCollapseState() {
  Object.keys(CATS).forEach(cat => {
    const sec = document.getElementById('sec-' + cat);
    if (sec && localStorage.getItem('navhub-collapse-' + cat) === 'true') {
      sec.classList.add('collapsed');
      const hd = sec.querySelector('.sec-hd');
      if (hd) hd.setAttribute('aria-expanded', 'false');
    }
  });
}

// ── TAG FILTER ─────────────────────────────────────────
function setCatTag(cat, tag) {
  catTagState[cat] = catTagState[cat] === tag ? '' : tag;
  const sec = document.getElementById('sec-' + cat);
  if (sec) sec.querySelectorAll('.stag').forEach(b => b.classList.toggle('active', b.dataset.tag === catTagState[cat]));
  renderSectionCards(cat);
}

// 标签条向右滚动（视觉稿右侧 › 按钮）
function scrollTagStrip(cat) {
  const sec = document.getElementById('sec-' + cat);
  const strip = sec && sec.querySelector('.tag-strip .sec-tags');
  if (strip) strip.scrollBy({ left: strip.clientWidth * 0.8, behavior: 'smooth' });
}

// ── HELPERS ────────────────────────────────────────────
const BADGE_CFG = {
  hot:  ['b-hot',  'HOT'],
  new:  ['b-new',  'NEW'],
  free: ['b-free', 'FREE'],
  cn:   ['b-cn',   '中文'],
  open: ['b-open', '开源'],
};

// favicon 多级解析链（任一源失败自动切下一个，全部失败才退默认地球图标）：
//   站点自带 img 字段（本地图标，优先）→ 站点根 /favicon.ico（官方）
//   → Google s2/favicons（解析任意域名真实 favicon，覆盖最广、极稳）
//   → DuckDuckGo 图标服务 → Clearbit 公司 logo → Bing（逐层兜底）
//   即使已有本地 img，仍保留外部源作为备份（本地文件损坏时不至于破图）
const _faviconCache = {};
function faviconSources(s) {
  const list = [];
  const local = (s && s.img) ? s.img : '';
  const isPlaceholder = /(^|\/)_ph_/.test(local);          // _ph_ 前缀 = 本地占位地球，仅作最终兜底
  const net = [];
  try {
    const host = new URL(s.url).hostname;
    net.push(
      `https://${host}/favicon.ico`,                          // 官方根 favicon
      `https://www.google.com/s2/favicons?domain=${host}&sz=128`, // Google：任意域名真实 favicon，覆盖最广
      `https://icon.horse/icon/${host}`,                      // icon.horse：解析力强
      `https://icons.duckduckgo.com/ip3/${host}.ico`,         // DDG：解析真实 favicon
      `https://logo.clearbit.com/${host}`,                    // Clearbit：公司 logo
      `https://www.bing.com/favicon.ico?url=${host}`,         // Bing：再兜底一层
    );
  } catch { /* 无 url 时仅用 s.img（若有） */ }
  if (local && !isPlaceholder) {
    list.push(local, ...net);        // 已缓存“真实”本地图标 → 优先本地，网络兜底
  } else {
    list.push(...net);
    if (local) list.push(local);     // 只有占位 → 网络真实图标优先，占位放最后兜底
  }
  return list;
}
function faviconFail(img) {
  // 当前 src 已失败 → 顺序尝试 data-sources 中的下一个源；全部耗尽 → 隐藏 img 露出底层默认地球
  const rest = (img.dataset.sources || '').split('|').filter(Boolean);
  const next = (parseInt(img.dataset.idx || '0', 10)) + 1;
  if (next < rest.length) {
    img.dataset.idx = String(next);
    img.src = rest[next];
  } else {
    img.classList.add('failed');              // 默认地球图标（CSS 背景）始终在底层，隐藏即透出
  }
}
// 描述若为纯 URL（用户手填）则不直接展示，退回域名
function isUrlLike(t) {
  return !t || /^https?:\/\//i.test(t.trim()) || /^www\./i.test(t.trim());
}
function descOf(s) {
  const d = (s.desc || '').trim();
  return isUrlLike(d) ? hostOf(s.url) : d;
}

function hostOf(url) {
  try { return new URL(url).hostname; } catch { return url; }
}

function buildCard(s) {
  const srcs   = faviconSources(s);
  const ico    = srcs[0] || '';
  const semBadge = s.badge && BADGE_CFG[s.badge] ? `<span class="card-badge ${BADGE_CFG[s.badge][0]}">${BADGE_CFG[s.badge][1]}</span>` : '';
  const urlBadges = getUrlBadges(s.url);
  // URL badge 移入 card-meta（host 行旁边），避开右上角 fav-btn
  const urlBadgeHtml = urlBadges.map(b => `<span class="b-url-inline" title="${b}">${b}</span>`).join('');
  const tagHtml= s.tags?.length ? s.tags.map(t => `<span class="ctag">${t}</span>`).join('') : '';
  const isFav  = favorites.has(s.url);
  // fav-btn 固定在右上角（top: 8px right: 8px）
  // semantic badge 紧挨 fav-btn 左侧（top: 8px right: 36px）
  const favBtn = `<button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFav(event,'${s.url}')" title="${isFav ? '取消收藏' : '收藏'}">${isFav ? '★' : '☆'}</button>`;
  const name_esc = s.name.replace(/'/g, "\\'");
  return `<a class="card" href="${s.url}" target="_blank" rel="noopener" onclick="openPreview(event,'${s.url}')">
    <div class="card-top">
      <div class="card-ico" id="ico-${btoa(s.url).replace(/[^a-zA-Z0-9]/g,'')}">
        ${ico ? `<img src="${ico}" alt="" loading="lazy" data-sources="${srcs.join('|')}" onerror="faviconFail(this)">` : ''}
      </div>
      <div class="card-meta">
        <div class="card-meta-row1">
          <span class="card-name">${s.name}</span>
          ${semBadge ? `<span class="sem-inline ${BADGE_CFG[s.badge][0]}">${BADGE_CFG[s.badge][1]}</span>` : ''}
        </div>
        <div class="card-meta-row2">
          <span class="card-host">${hostOf(s.url)}</span>
          ${urlBadgeHtml ? `<span class="url-badges">${urlBadgeHtml}</span>` : ''}
        </div>
      </div>
      ${favBtn}
    </div>
    ${descOf(s) ? `<div class="card-desc">${descOf(s)}</div>` : ''}
    <div class="card-tags-row">${tagHtml}</div>
    <span class="card-out" aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M9 7h8v8"/></svg>
    </span>
  </a>`;
}

// ── 站点预览弹层（点击卡片时显示，可选择新标签或内嵌 iframe） ──
let previewSite = null;
let previewLastFocus = null;
let iframeVisible = false;

function openPreview(e, url) {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;  // 保留浏览器默认新窗口行为
  e.preventDefault();
  const site = SITES.find(s => s.url === url);
  if (!site) { window.open(url, '_blank', 'noopener'); return; }
  previewSite = site;
  iframeVisible = false;
  previewLastFocus = document.activeElement;

  const modal = document.getElementById('previewModal');
  document.getElementById('previewTitle').textContent = site.name || hostOf(site.url);
  document.getElementById('previewUrl').textContent = site.url;
  document.getElementById('previewDesc').textContent = descOf(site);
  const icoEl = document.getElementById('previewIco');
  const srcs = faviconSources(site);
  icoEl.innerHTML = srcs[0]
    ? `<img src="${srcs[0]}" alt="" data-sources="${srcs.join('|')}" onerror="faviconFail(this)">`
    : '';
  document.getElementById('previewIframe').src = 'about:blank';
  document.getElementById('previewToggleBtn').textContent = '🖥 内嵌预览';
  document.getElementById('previewPlaceholder').style.display = 'flex';
  document.getElementById('previewIframe').classList.remove('active');

  modal.classList.add('open');
  document.body.classList.add('modal-open');
  setTimeout(() => document.getElementById('previewOpenBtn').focus(), 60);
}

function togglePreviewIframe() {
  if (!previewSite) return;
  iframeVisible = !iframeVisible;
  const iframe = document.getElementById('previewIframe');
  const placeholder = document.getElementById('previewPlaceholder');
  if (iframeVisible) {
    iframe.src = previewSite.url;
    iframe.classList.add('active');
    placeholder.style.display = 'none';
    document.getElementById('previewToggleBtn').textContent = '⤴ 返回详情';
  } else {
    iframe.src = 'about:blank';
    iframe.classList.remove('active');
    placeholder.style.display = 'flex';
    document.getElementById('previewToggleBtn').textContent = '🖥 内嵌预览';
  }
}

function openPreviewInNewTab() {
  if (previewSite) window.open(previewSite.url, '_blank', 'noopener');
}

function closePreview() {
  const modal = document.getElementById('previewModal');
  modal.classList.remove('open');
  document.body.classList.remove('modal-open');
  document.getElementById('previewIframe').src = 'about:blank';
  previewSite = null;
  if (previewLastFocus && previewLastFocus.focus) previewLastFocus.focus();
  previewLastFocus = null;
}

// 遮罩点击关闭 + ESC 关闭 + Tab 焦点陷阱
(function bindPreviewChrome() {
  const p = document.getElementById('previewModal');
  if (!p) return;
  p.addEventListener('click', e => { if (e.target === e.currentTarget) closePreview(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (p.classList.contains('open')) closePreview(); return; }
    if (e.key !== 'Tab' || !p.classList.contains('open')) return;
    const box = p.querySelector('.preview-box');
    const f = box.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea,[tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
})();

// ── 智能子标签生成（基于 URL/name 启发式） ──
function enrichTags(site) {
  if (!site.tags) site.tags = [];
  const url = (site.url || '').toLowerCase();
  const name = site.name || '';
  // 国漫/日漫/美漫/韩漫（适用于 anime/manga 类）
  const isAnime = site.tags.includes('动漫') || site.tags.includes('漫画')
    || /manga|anime|dongman|manhua/.test(url);
  if (isAnime) {
    if (/国|国创|国产|国漫/.test(name)
        || /guoman|guochuang|dmzj|sfacg|bilibili/.test(url)
        || /dm5\.com|manben\.com|gufengmh\.com/.test(url)) {
      if (!site.tags.includes('国漫')) site.tags.push('国漫');
    } else if (/日|日漫|日本/.test(name)
        || /anime1|dmhyy|jciyuan|ezdmw|fanchawu|ikan/.test(url)) {
      if (!site.tags.includes('日漫')) site.tags.push('日漫');
    } else if (/美|美漫|欧美/.test(name)
        || /webtoons|mangadex|komiic|mangakakalot|mangaowl/.test(url)) {
      if (!site.tags.includes('美漫')) site.tags.push('美漫');
    } else if (/韩|韩漫|韩国/.test(name) || /webtoon|naver/.test(url)) {
      if (!site.tags.includes('韩漫')) site.tags.push('韩漫');
    }
  }
  // 网页版/APP 平台类型（适用于所有类）
  const cleanedUrl = url.replace(/^https?:\/\//, '');
  const isMobile = /^m\./.test(cleanedUrl) || /\/(m|app|h5)(\/|$|\?)/.test('/' + cleanedUrl)
                  || /\.apk(\?|$)/.test(cleanedUrl) || /app\./.test(cleanedUrl);
  if (isMobile) {
    if (!site.tags.includes('APP') && !site.tags.includes('移动版')) site.tags.push('APP');
  } else {
    if (!site.tags.includes('APP') && !site.tags.includes('网页版') && !site.tags.includes('移动版')) {
      site.tags.push('网页版');
    }
  }
  return site;
}

function getTagsForCat(cat) {
  // 平台型 tag（网页版/APP/移动版）不显示在子分类 tab 上（信息量太低）
  // 但仍保留在卡片的 tag chip 中
  const PLATFORM_TAGS = new Set(['网页版', 'APP', '移动版']);
  const seen = new Set(), out = [];
  SITES.filter(s => s.cat === cat).forEach(s => (s.tags || []).forEach(t => {
    if (PLATFORM_TAGS.has(t)) return;
    if (!seen.has(t)) { seen.add(t); out.push(t); }
  }));
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
    const tagPills = tags.length > 1 ? `<div class="tag-strip">
      <div class="sec-tags">
        <button class="stag${!at ? ' active' : ''}" data-tag="" onclick="setCatTag('${cat}','')">全部</button>
        ${tags.map(t => `<button class="stag${at === t ? ' active' : ''}" data-tag="${t}" onclick="setCatTag('${cat}','${t}')">${t}</button>`).join('')}
      </div>
      <button class="tag-strip-more" onclick="scrollTagStrip('${cat}')" aria-label="更多分类" title="更多分类">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>
      </button>
    </div>` : '';
    const items = SITES.filter(s => s.cat === cat && (!at || (s.tags || []).includes(at)));
    return `<div class="section ${m.cls}" id="sec-${cat}">
      <div class="sec-hd" role="button" tabindex="0" aria-expanded="${localStorage.getItem('navhub-collapse-' + cat) === 'true' ? 'false' : 'true'}" onclick="toggleSection('${cat}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleSection('${cat}')}">
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
// 顶部分类快捷条（6 个入口，对应视觉稿的横向分类栏）
const HERO_STRIP = [
  { cat:'ai',    label:'AI 工具',  sub:'智能生产力' },
  { cat:'asset', label:'设计资源', sub:'创意与灵感' },
  { cat:'dev',   label:'开发工具', sub:'开发者必备' },
  { cat:'media', label:'影视资源', sub:'追剧看片' },
  { cat:'game',  label:'游戏资源', sub:'畅玩游戏' },
  { cat:'tools', label:'实用工具', sub:'日常必备' },
];

// 快捷分类图标：统一线性风格 SVG（避免 emoji，视觉更专业）
const STRIP_ICONS = {
  ai:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5l1.9 4.3 4.6.5-3.4 3.1.9 4.6-4-2.3-4 2.3.9-4.6-3.4-3.1 4.6-.5L12 2.5z"/><path d="M18.5 17.5l.8 1.8 1.9.2-1.4 1.3.4 1.9-1.7-.9-1.7.9.4-1.9-1.4-1.3 1.9-.2.8-1.8z"/></svg>',
  asset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.2a8.8 8.8 0 100 17.6c1.3 0 2-.9 2-1.9 0-.5-.2-.9-.5-1.2-.3-.4-.5-.8-.5-1.2 0-1 .8-1.9 1.9-1.9h1.8a4.3 4.3 0 004.3-4.3c0-4-4-7.1-9-7.1z"/><circle cx="7.8" cy="10.4" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="7.4" r="1.1" fill="currentColor" stroke="none"/><circle cx="16.2" cy="10.4" r="1.1" fill="currentColor" stroke="none"/></svg>',
  dev:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8.6 7.6L4 12l4.6 4.4"/><path d="M15.4 7.6L20 12l-4.6 4.4"/><path d="M13.6 4.6l-3.2 14.8"/></svg>',
  media: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="2.8" y="4.8" width="18.4" height="14.4" rx="2.6"/><path d="M10.2 9.6l4.8 2.4-4.8 2.4V9.6z" fill="currentColor" stroke="none"/></svg>',
  game:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7.4 8h9.2a4.6 4.6 0 014.4 6.1l-.6 1.7a2.3 2.3 0 01-4.1.6l-1-1.5H8.7l-1 1.5a2.3 2.3 0 01-4.1-.6l-.6-1.7A4.6 4.6 0 017.4 8z"/><path d="M7.4 11.6v2.6M6.1 12.9h2.6" stroke-linecap="round"/><circle cx="16.4" cy="11.9" r="1" fill="currentColor" stroke="none"/><circle cx="18.2" cy="13.6" r="1" fill="currentColor" stroke="none"/></svg>',
  tools: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="7.4" width="18" height="12.2" rx="2.4"/><path d="M8.6 7.4V5.6a1.8 1.8 0 011.8-1.8h3.2a1.8 1.8 0 011.8 1.8v1.8"/><path d="M3 12.6h18"/></svg>',
};

function renderHeroStrip() {
  const el = document.getElementById('heroStrip');
  if (!el) return;
  el.innerHTML = HERO_STRIP.map(s => `
    <button class="strip-item" onclick="jumpToCat('${s.cat}')">
      <span class="strip-ico">${STRIP_ICONS[s.cat]}</span>
      <span><span class="strip-label">${s.label}</span><span class="strip-sub">${s.sub}</span></span>
    </button>`).join('');
}

// 精选推荐：4 张渐变大卡片（视觉稿面板）
const FEAT_GRAD = ['feat-g1', 'feat-g2', 'feat-g3', 'feat-g4'];

function renderFeatured() {
  const el = document.getElementById('featured');
  if (!el) return;
  const picks = topPicks(pickSeed, 4);
  if (!picks.length) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div class="feat-head">
      <div class="feat-title"><span class="fi">★</span>精选推荐</div>
      <button class="feat-more" onclick="refreshPicks()">查看更多
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </button>
    </div>
    <div class="feat-grid">
      ${picks.map((s, i) => {
        const srcs = faviconSources(s);
        const ico = srcs[0] || '';
        const catLabel = CATS[s.cat] ? CATS[s.cat].label : '精选';
        return `<a class="feat-card ${FEAT_GRAD[i % FEAT_GRAD.length]}" href="${s.url}" target="_blank" rel="noopener">
          <div class="feat-row">
            <div class="feat-ico">
              ${ico ? `<img src="${ico}" alt="" loading="lazy" data-sources="${srcs.join('|')}" onerror="faviconFail(this)">` : ''}
            </div>
            <div class="feat-body">
              <div class="feat-name">${s.name}</div>
              <div class="feat-desc">${descOf(s)}</div>
            </div>
          </div>
          <div class="feat-foot">
            <span class="feat-cat">${catLabel}</span>
            <span class="feat-go">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
            </span>
          </div>
        </a>`;
      }).join('')}
    </div>`;
}

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
    const sw = document.querySelector('.search-wrap'); if (sw) sw.classList.remove('has-value');
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
  const sw = document.querySelector('.search-wrap'); if (sw) sw.classList.remove('has-value');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.cat === catKey));
  render(); syncURL();
  scrollToSection(catKey);
}

// picks
// ── 精选推荐：按“质量分”挑最优质的站点 ──
// 权重：精选徽章 > 真实图标 > 真实描述 > 有标签
const _isNavigable = (u) => /^https?:\/\//i.test(u || '');
const _hasRealDesc = (s) => !!(s.desc && !/^https?:/i.test(s.desc.trim()));
const _hasRealIcon = (s) => !!(s.img && !/icons\/_ph_/.test(s.img));

function qualityScore(s) {
  if (!_isNavigable(s.url)) return -1;              // 不可访问的站点排除
  let score = 0;
  if (s.badge === 'hot') score += 100;
  else if (s.badge === 'new') score += 60;
  if (_hasRealIcon(s)) score += 25;
  if (_hasRealDesc(s)) score += 15;
  if (s.tags && s.tags.length) score += 10;
  if (s.badge === 'cn') score += 5;                 // 中文站点加分（站内主力用户）
  return score;
}

// 精选池 = 质量分达标（有徽章或真实图标+真实描述）的站点
const PICK_POOL = SITES
  .map(s => ({ s, q: qualityScore(s) }))
  .filter(x => x.q >= 40)
  .sort((a, b) => b.q - a.q)
  .map(x => x.s)
  .filter((s, i, a) => a.findIndex(x => x.url === s.url) === i);

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

// 精选推荐：仅在高分池的头部抽取，保证首屏推荐始终是优质站点
function topPicks(seed, n) {
  const head = PICK_POOL.slice(0, Math.max(n * 8, 32));   // 只看最靠前的优质站点
  const out = [];
  const used = new Set();
  let s = seed;
  while (out.length < n && head.length) {
    s = (s * 9301 + 49297) % 233280;
    const idx = Math.floor(s / 233280 * head.length);
    const item = head[idx];
    if (item && !used.has(item.url)) { used.add(item.url); out.push(item); }
    head.splice(idx, 1);
  }
  return out;
}

function renderHeroPicks(seed) {
  const el = document.getElementById('heroPicks');
  if (!el) return;
  el.innerHTML = seededRandPicks(seed, 3).map(s => {
    const srcs = faviconSources(s);
    const ico = srcs[0] || '';
    const name_esc = s.name.replace(/'/g, "\\'");
    return `<a class="pick-card" href="${s.url}" target="_blank" rel="noopener">
      <div class="pick-ico">
        ${ico ? `<img src="${ico}" alt="" loading="lazy" data-sources="${srcs.join('|')}" onerror="faviconFail(this)">` : ''}
      </div>
      <div class="pick-body">
        <div class="pick-name">${s.name}</div>
        <div class="pick-desc">${descOf(s)}</div>
      </div>
      <span class="pick-label">精选</span>
    </a>`;
  }).join('');
}

function refreshPicks() { pickSeed = Date.now(); renderHeroPicks(pickSeed); renderFeatured(); }

function initHero() {
  // sync theme icon
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const btn = document.getElementById('themeBtn');
  if (btn) btn.querySelector('.sfoot-icon').textContent = isDark ? '🌙' : '☀️';
  renderHeroScenarios();
  renderHeroPicks(pickSeed);
  renderHeroStrip();
  renderFeatured();
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

  // sync view toggle UI (topbar + stats row)
  ['vgrid','sgrid'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.toggle('active', state.view === 'grid'); });
  ['vlist','slist'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.toggle('active', state.view === 'list'); });
})();
