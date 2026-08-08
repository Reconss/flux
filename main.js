// ════════════════════════════════════════════════════════
// FLUX · main.js (Redesigned)
// ════════════════════════════════════════════════════════

// ── 从 config.js 加载分类配置 ──
const CATS = (function() {
  if (typeof CONFIG === 'undefined') return {};
  const out = {};
  Object.entries(CONFIG.cats).forEach(([k, v]) => {
    out[k] = {label: v.label, cls: 'c-' + k, icon: v.icon};
  });
  return out;
})();

// ── 把 CONFIG 应用到 SITES（合并 cat / tags） ──
function applyConfig() {
  if (typeof CONFIG === 'undefined') {
    console.warn('CONFIG not loaded, using raw SITES');
    return;
  }
  const domainCache = {};
  function matchDomain(url) {
    try {
      const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
      const parts = host.split('.');
      const reg = parts.length >= 2 ? parts.slice(-2).join('.') : host;
      for (const r of CONFIG.rules) {
        if (reg === r.domain || host.endsWith('.' + r.domain) || host === r.domain) {
          return r;
        }
      }
    } catch (e) {}
    return null;
  }
  SITES.forEach(s => {
    // 1. sites 精确覆盖（最高优先级）
    if (CONFIG.sites && CONFIG.sites[s.url]) {
      s.cat  = CONFIG.sites[s.url].cat;
      s.tags = CONFIG.sites[s.url].tags || [];
      return;
    }
    // 2. rules 域名匹配
    const rule = matchDomain(s.url);
    if (rule) {
      s.cat  = rule.cat;
      s.tags = rule.tag ? [rule.tag] : [];
      return;
    }
    // 3. 默认归类
    s.cat  = CONFIG.default.cat;
    s.tags = CONFIG.default.tags || [];
  });
}
applyConfig();

let state = { cat: 'all', sub: '', view: 'grid', query: '' };
let favorites = new Set(JSON.parse(localStorage.getItem('navhub-favs') || '[]'));

// ── NAVIGATION ─────────────────────────────────────────
function buildNav() {
  const nav = document.getElementById('navWrap');
  const navItems = [
    {cat:'all', icon:'⊞', label:'全部网站', group:''},
    {cat:'fav', icon:'⭐', label:'我的收藏', group:''},
  ];
  // 按 CATS 顺序
  Object.entries(CATS).forEach(([k, v]) => {
    navItems.push({cat:k, icon:v.icon, label:v.label, group: v.icon === '📚' || v.icon === '🛠' || v.icon === '📖' || v.icon === '🤖' || v.icon === '💻' ? '内容 & 创作' : 
                 v.icon === '🎬' || v.icon === '🎵' || v.icon === '🎮' ? '影音 & 娱乐' : '资源 & 系统'});
  });

  let html = '';
  let lastGroup = '';
  navItems.forEach((item, i) => {
    if (item.group && item.group !== lastGroup) {
      if (lastGroup) html += '</div>';
      html += `<div class="nav-group"><div class="nav-group-label">${item.group}</div>`;
      lastGroup = item.group;
    } else if (!item.group && lastGroup) {
      html += '</div>';
      lastGroup = '';
    }
    html += `<button class="nav-item ${state.cat===item.cat?'active':''}" data-cat="${item.cat}" onclick="setNav('${item.cat}')">
      <span class="nav-icon">${item.icon}</span>
      <span>${item.label}</span>
      <span class="nav-count" id="nc-${item.cat}">0</span>
    </button>`;
  });
  if (lastGroup) html += '</div>';
  nav.innerHTML = html;
}

function setNav(cat) {
  state.cat = cat;
  state.sub = '';
  state.query = '';
  document.getElementById('searchInput').value = '';
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.cat === cat));
  render();
  window.scrollTo({top: 0, behavior: 'smooth'});
}

// ── SEARCH ─────────────────────────────────────────────
function doSearch(v) {
  state.query = v;
  state.sub = '';
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.cat === 'all'));
  state.cat = 'all';
  render();
}

function setSub(tag) {
  state.sub = (state.sub === tag) ? '' : tag;
  render();
  const el = document.querySelector('.sub-bar');
  if (el) el.scrollIntoView({behavior:'smooth', block:'start'});
}

// ── VIEW ───────────────────────────────────────────────
function setView(v) {
  state.view = v;
  document.getElementById('vgrid').classList.toggle('active', v === 'grid');
  document.getElementById('vlist').classList.toggle('active', v === 'list');
  localStorage.setItem('navhub-view', v);
  render();
}

// ── FAVORITES ──────────────────────────────────────────
function toggleFav(e, url) {
  e.preventDefault(); e.stopPropagation();
  favorites.has(url) ? favorites.delete(url) : favorites.add(url);
  localStorage.setItem('navhub-favs', JSON.stringify([...favorites]));
  updateCounts();
  render();
}

// ── EDITOR ─────────────────────────────────────────────
let editingUrl = null;

function toggleEditor() {
  const m = document.getElementById('editorModal');
  m.classList.toggle('open');
  if (m.classList.contains('open')) {
    const sel = document.getElementById('editCat');
    sel.innerHTML = Object.entries(CATS).map(([k, v]) => `<option value="${k}">${v.icon} ${v.label}</option>`).join('');
  }
}

function addSite() {
  const name  = document.getElementById('editName').value.trim();
  let   url   = document.getElementById('editUrl').value.trim();
  const cat   = document.getElementById('editCat').value;
  const desc  = document.getElementById('editDesc').value.trim();
  const tags  = document.getElementById('editTags').value.split(',').map(t=>t.trim()).filter(Boolean);
  const badge = document.getElementById('editBadge').value;
  if (!name || !url) { alert('名称和网址不能为空'); return; }
  if (!url.match(/^https?:\/\//)) url = 'https://' + url;
  SITES.push({cat, name, url, desc, tags, badge});
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
  const tags  = document.getElementById('editTags').value.split(',').map(t=>t.trim()).filter(Boolean);
  const badge = document.getElementById('editBadge').value;
  const idx = SITES.findIndex(s => s.url === editingUrl);
  if (idx !== -1 && name && url) {
    SITES[idx] = {cat, name, url, desc, tags, badge};
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
  const blob = new Blob([JSON.stringify({sites: SITES, favorites: [...favorites]}, null, 2)], {type: 'application/json'});
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
      if (data.sites) {
        SITES.splice(0, SITES.length, ...data.sites);
        localStorage.setItem('navhub-sites', JSON.stringify(SITES));
      }
      if (data.favorites) {
        favorites = new Set(data.favorites);
        localStorage.setItem('navhub-favs', JSON.stringify([...favorites]));
      }
      updateCounts(); render();
      alert('导入成功！');
    } catch(e) { alert('导入失败：' + e.message); }
  };
  r.readAsText(f);
  input.value = '';
}

// ── THEME ──────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('themeBtn');
  if (btn) btn.querySelector('span').textContent = theme === 'dark' ? '🌙' : '☀️';
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
  document.getElementById('favCount').textContent = favorites.size;
  const elAll = document.getElementById('nc-all');
  const elFav = document.getElementById('nc-fav');
  if (elAll) elAll.textContent = SITES.length;
  if (elFav) elFav.textContent = favorites.size;
  Object.keys(CATS).forEach(c => {
    const el = document.getElementById('nc-' + c);
    if (el) el.textContent = SITES.filter(s => s.cat === c).length;
  });
}

// ── RENDER ─────────────────────────────────────────────
function buildCard(s) {
  const isFav = favorites.has(s.url);
  const favBtn = `<button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFav(event,'${s.url}')" title="${isFav ? '取消收藏' : '收藏'}">${isFav ? '★' : '☆'}</button>`;
  const badge = s.badge ? `<span class="card-badge">${s.badge.toUpperCase()}</span>` : '';
  const tagHtml = (s.tags||[]).slice(0, 2).map(t => `<span class="ctag">${t}</span>`).join('');
  let host = '';
  try { host = new URL(s.url).hostname; } catch { }
  // 使用 Google Favicon 服务
  const favicon = host ? `https://www.google.com/s2/favicons?domain=${host}&sz=64` : '';
  const icoImg = favicon ? `<img src="${favicon}" alt="" loading="lazy" onerror="this.parentNode.innerHTML='${s.name[0]}'">` : s.name[0];
  
  return `<a class="card" href="${s.url}" target="_blank" rel="noopener">
    <div class="card-top">
      <div class="card-ico">${icoImg}</div>
      <div class="card-meta">
        <div class="card-name">${s.name}</div>
        <div class="card-host">${host}</div>
        <div class="card-tags-row">${tagHtml}</div>
      </div>
      ${badge}${favBtn}
    </div>
    ${s.desc ? `<div class="card-desc">${s.desc}</div>` : ''}
  </a>`;
}

function render() {
  const content = document.getElementById('content');
  const q = state.query.toLowerCase();
  const lv = state.view === 'list' ? ' list-view' : '';
  
  // Search
  if (q) {
    const hits = SITES.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.desc||'').toLowerCase().includes(q) ||
      s.url.toLowerCase().includes(q) ||
      (s.tags||[]).some(t => t.toLowerCase().includes(q))
    );
    const groups = {};
    hits.forEach(s => { (groups[s.cat] = groups[s.cat] || []).push(s); });
    const order = Object.keys(CATS).filter(c => groups[c]);
    if (!order.length) {
      content.innerHTML = `<div class="empty">没有找到 "${state.query}" 相关内容 🔍<br><small style="margin-top:6px;display:block">试试其他关键词</small></div>`;
      return;
    }
    content.innerHTML = order.map(cat => {
      const m = CATS[cat];
      return `<div class="section" id="sec-${cat}">
        <div class="sec-hd"><div class="sec-dot"></div><span class="sec-title">${m.icon} ${m.label}</span><span class="sec-count">${groups[cat].length} 个</span></div>
        <div class="cards${lv}">${groups[cat].map(buildCard).join('')}</div>
      </div>`;
    }).join('');
    return;
  }
  
  // Favorites
  if (state.cat === 'fav') {
    const favItems = SITES.filter(s => favorites.has(s.url));
    content.innerHTML = `<div class="section">
      <div class="sec-hd"><div class="sec-dot" style="background:#FBBF24"></div><span class="sec-title">⭐ 我的收藏</span><span class="sec-count">${favItems.length} 个</span></div>
      <div class="cards${lv}">${favItems.length ? favItems.map(buildCard).join('') : '<div class="empty">暂无收藏，点击卡片上的 ☆ 收藏站点</div>'}</div>
    </div>`;
    return;
  }
  
  // Normal
  const cats = state.cat === 'all' ? Object.keys(CATS) : [state.cat];
  // 全部视图：保持简洁的扁平 section（不展开子分类）
  if (state.cat === 'all') {
    content.innerHTML = cats.map(cat => {
      const m = CATS[cat];
      const items = SITES.filter(s => s.cat === cat);
      if (!items.length) return '';
      return `<div class="section" id="sec-${cat}">
        <div class="sec-hd">
          <div class="sec-dot"></div>
          <span class="sec-title">${m.icon} ${m.label}</span>
          <span class="sec-count">${items.length} 个</span>
        </div>
        <div class="cards${lv}">${items.map(buildCard).join('')}</div>
      </div>`;
    }).filter(Boolean).join('');
    bindTilt();
    return;
  }
  // 单个分类视图：sub-bar 筛选条 + 按子分类视觉分组
  content.innerHTML = cats.map(cat => {
    const m = CATS[cat];
    const items = SITES.filter(s => s.cat === cat);
    if (!items.length) return '';
    // 计算子分类（仅数量 >=3 的，避免 tab 过多）
    const tagCount = {};
    items.forEach(s => (s.tags||[]).forEach(t => tagCount[t] = (tagCount[t]||0)+1));
    const subTags = Object.entries(tagCount).filter(([_,c]) => c >= 3).sort((a,b) => b[1]-a[1]);
    const subBar = subTags.length ? `
      <div class="sub-bar" role="tablist" aria-label="${m.label}子分类">
        <button class="sub-pill ${state.sub===''?'active':''}" role="tab" aria-selected="${state.sub===''}" onclick="setSub('')">全部 <span class="sub-c">${items.length}</span></button>
        ${subTags.map(([t, c]) => `<button class="sub-pill ${state.sub===t?'active':''}" role="tab" aria-selected="${state.sub===t}" onclick="setSub('${t.replace(/'/g, "\\'")}')">${t} <span class="sub-c">${c}</span></button>`).join('')}
      </div>` : '';
    // 子分类过滤
    const filtered = state.sub ? items.filter(s => (s.tags||[]).includes(state.sub)) : items;
    // 全部模式下按子分类分组
    let bodyHtml = '';
    if (!state.sub && subTags.length) {
      // 主组（不属任何 subTag 的）
      const noSub = items.filter(s => !s.tags || !s.tags.some(t => subTags.some(([t2]) => t2 === t)));
      if (noSub.length) {
        bodyHtml += `<div class="sub-group"><div class="sub-group-hd">其他</div><div class="cards${lv}">${noSub.map(buildCard).join('')}</div></div>`;
      }
      subTags.forEach(([t, c]) => {
        const groupItems = items.filter(s => (s.tags||[]).includes(t));
        if (!groupItems.length) return;
        bodyHtml += `<div class="sub-group"><div class="sub-group-hd">${t} <span class="sub-group-c">${c}</span></div><div class="cards${lv}">${groupItems.map(buildCard).join('')}</div></div>`;
      });
    } else {
      // 过滤模式：扁平展示
      bodyHtml = filtered.length ? `<div class="cards${lv}">${filtered.map(buildCard).join('')}</div>` : `<div class="empty" style="padding:60px 20px;color:var(--text-m);text-align:center;">该子分类下暂无内容</div>`;
    }
    const countText = state.sub ? `${filtered.length} / ${items.length} 个` : `${items.length} 个`;
    return `<div class="section" id="sec-${cat}">
      <div class="sec-hd">
        <div class="sec-dot"></div>
        <span class="sec-title">${m.icon} ${m.label}</span>
        <span class="sec-count">${countText}</span>
      </div>
      ${subBar}
      ${bodyHtml}
    </div>`;
  }).filter(Boolean).join('');
  
  bindTilt();
}

// ── TILT EFFECT ────────────────────────────────────────
function bindTilt() {
  document.querySelectorAll('.card').forEach(card => {
    card.style.transformStyle = 'preserve-3d';
    card.onpointermove = e => {
      const b = card.getBoundingClientRect();
      const px = (e.clientX - b.left) / b.width - 0.5;
      const py = (e.clientY - b.top) / b.height - 0.5;
      card.style.transform = `translateY(-2px) rotateY(${px*5}deg) rotateX(${-py*5}deg)`;
    };
    card.onpointerleave = () => { card.style.transform = ''; };
  });
}

// ── SCROLL TO TOP ──────────────────────────────────────
window.addEventListener('scroll', () => {
  const btn = document.getElementById('backToTop');
  if (btn) btn.classList.toggle('show', window.scrollY > 300);
});

// ── ORB PARALLAX ────────────────────────────────────────
document.addEventListener('pointermove', e => {
  const cx = e.clientX / window.innerWidth - 0.5;
  const cy = e.clientY / window.innerHeight - 0.5;
  document.querySelectorAll('.orb').forEach((o, i) => {
    const d = [0.5, 0.9, 0.7][i];
    o.style.transform = `translate(${cx*d*25}px, ${cy*d*18}px)`;
  });
});

// ── INIT ───────────────────────────────────────────────
(function init() {
  const savedSites = localStorage.getItem('navhub-sites');
  if (savedSites) { try { SITES.splice(0, SITES.length, ...JSON.parse(savedSites)); } catch(e) {} }
  const savedView = localStorage.getItem('navhub-view');
  if (savedView) state.view = savedView;
  
  // theme
  const saved = localStorage.getItem('navhub-theme');
  if (saved) applyTheme(saved);
  
  buildNav();
  updateCounts();
  render();
  document.getElementById('vgrid').classList.toggle('active', state.view === 'grid');
  document.getElementById('vlist').classList.toggle('active', state.view === 'list');
})();
