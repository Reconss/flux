// ════════════════════════════════════════════════════════
// FLUX · go.js — 安全跳转页逻辑
// ════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── 配置合并（与 main.js 保持一致，保证站点分类可用） ──
  function applyConfig() {
    if (typeof CONFIG === 'undefined' || !Array.isArray(SITES)) return;
    SITES.forEach(s => {
      if (s.cat) { s.tags = s.tags || []; return; }
      if (CONFIG.sites && CONFIG.sites[s.url]) {
        const ov = CONFIG.sites[s.url];
        s.cat = ov.cat;
        s.tags = ov.tags || [];
        if (ov.name) s.name = ov.name;
        return;
      }
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
      s.cat = (CONFIG.default && CONFIG.default.cat) || 'tools';
      s.tags = (CONFIG.default && CONFIG.default.tags) || [];
    });
  }

  function enrichTags(site) {
    if (!site.tags) site.tags = [];
    const url = (site.url || '').toLowerCase();
    const name = site.name || '';
    const isAnime = site.tags.includes('动漫') || site.tags.includes('漫画')
      || /manga|anime|dongman|manhua/.test(url);
    if (isAnime) {
      if (/国|国创|国产|国漫/.test(name) || /guoman|guochuang|dmzj|sfacg|bilibili/.test(url)) {
        if (!site.tags.includes('国漫')) site.tags.push('国漫');
      } else if (/日|日漫|日本/.test(name) || /anime1|dmhyy|jciyuan|ezdmw|fanchawu|ikan/.test(url)) {
        if (!site.tags.includes('日漫')) site.tags.push('日漫');
      } else if (/美|美漫|欧美/.test(name) || /webtoons|mangadex|komiic|mangakakalot|mangaowl/.test(url)) {
        if (!site.tags.includes('美漫')) site.tags.push('美漫');
      } else if (/韩|韩漫|韩国/.test(name) || /webtoon|naver/.test(url)) {
        if (!site.tags.includes('韩漫')) site.tags.push('韩漫');
      }
    }
    const cleanedUrl = url.replace(/^https?:\/\//, '');
    const isMobile = /^m\./.test(cleanedUrl) || /\/(m|app|h5)(\/|$|\?)/.test('/' + cleanedUrl)
      || /\.apk(\?|$)/.test(cleanedUrl) || /app\./.test(cleanedUrl);
    if (isMobile) {
      if (!site.tags.includes('APP') && !site.tags.includes('移动版')) site.tags.push('APP');
    } else if (!site.tags.includes('APP') && !site.tags.includes('网页版') && !site.tags.includes('移动版')) {
      site.tags.push('网页版');
    }
    return site;
  }

  function hostOf(url) {
    try { return new URL(url).hostname; } catch { return url; }
  }
  function isUrlLike(t) { return !t || /^https?:\/\//i.test(t.trim()) || /^www\./i.test(t.trim()); }
  function descOf(s) { return isUrlLike(s.desc) ? hostOf(s.url) : (s.desc || '').trim(); }

  const BADGE_CFG = {
    hot:  ['b-hot',  'HOT'],
    new:  ['b-new',  'NEW'],
    free: ['b-free', 'FREE'],
    cn:   ['b-cn',   '中文'],
    open: ['b-open', '开源']
  };

  // ── favicon 多级兜底 ──
  function faviconSources(s) {
    const list = [];
    const local = (s && s.img) ? s.img : '';
    const isPlaceholder = /(^|\/)_ph_/.test(local);
    const net = [];
    try {
      const host = new URL(s.url).hostname;
      net.push(
        `https://${host}/favicon.ico`,
        `https://www.google.com/s2/favicons?domain=${host}&sz=128`,
        `https://icon.horse/icon/${host}`,
        `https://icons.duckduckgo.com/ip3/${host}.ico`,
        `https://logo.clearbit.com/${host}`,
        `https://www.bing.com/favicon.ico?url=${host}`
      );
    } catch (e) {}
    if (local && !isPlaceholder) list.push(local, ...net);
    else {
      list.push(...net);
      if (local) list.push(local);
    }
    return list;
  }
  function faviconFail(img) {
    const rest = (img.dataset.sources || '').split('|').filter(Boolean);
    const next = (parseInt(img.dataset.idx || '0', 10)) + 1;
    if (next < rest.length) {
      img.dataset.idx = String(next);
      img.src = rest[next];
    } else {
      img.classList.add('failed');
    }
  }
  window.faviconFail = faviconFail;

  function iconHtml(s, cls) {
    const srcs = faviconSources(s);
    const src = srcs[0] || '';
    if (!src) return '';
    return `<img class="${cls || ''}" src="${src}" alt="" loading="lazy"
      data-sources="${srcs.join('|')}" onerror="faviconFail(this)">`;
  }

  // ── 读取目标站点 ──
  function resolveSite() {
    const p = new URLSearchParams(location.search);
    const id = p.get('id');
    const rawUrl = p.get('u') || p.get('url');
    let target = rawUrl || '';
    if (!target && id) {
      const byId = SITES.find(s => s.id === id);
      if (byId) target = byId.url;
    }
    try { target = decodeURIComponent(target); } catch (e) {}
    if (!target) return null;
    let parsed;
    try { parsed = new URL(target); } catch (e) { return null; }
    if (!/^https?:$/.test(parsed.protocol)) return null;

    const exact = SITES.find(s => s.url === target);
    if (exact) return exact;
    const loose = SITES.find(s => {
      try { return new URL(s.url).hostname === parsed.hostname; } catch (e) { return false; }
    });
    if (loose) return loose;
    return {
      name: parsed.hostname.replace(/^www\./, ''),
      url: target,
      desc: parsed.hostname,
      cat: 'tools',
      tags: []
    };
  }

  // ── 渲染 ──
  const $ = id => document.getElementById(id);
  let site = null;
  let countdown = 0;
  let timer = null;
  let paused = false;

  function renderSite(s) {
    $('siteName').textContent = s.name || hostOf(s.url);
    $('siteHost').textContent = hostOf(s.url);
    $('siteDesc').textContent = descOf(s) || '暂无简介';

    const badge = s.badge && BADGE_CFG[s.badge] ? BADGE_CFG[s.badge] : null;
    const badgeEl = $('siteBadge');
    if (badge) {
      badgeEl.hidden = false;
      badgeEl.className = 'go-badge ' + badge[0];
      badgeEl.textContent = badge[1];
    }

    const iconEl = $('siteIcon');
    const srcs = faviconSources(s);
    if (srcs.length) {
      iconEl.innerHTML = `<img src="${srcs[0]}" alt="" data-sources="${srcs.join('|')}" onerror="faviconFail(this)"><span class="icon-fallback">${(s.name || '?').trim().charAt(0).toUpperCase()}</span>`;
      const img = iconEl.querySelector('img');
      img.addEventListener('load', () => iconEl.classList.add('has-img'));
    }

    const tags = (s.tags || []).filter(t => !['网页版', 'APP', '移动版', '其他'].includes(t)).slice(0, 8);
    $('siteTags').innerHTML = tags.map(t => `<span class="go-tag">${escapeHtml(t)}</span>`).join('');

    document.title = `即将前往 ${s.name || hostOf(s.url)} · Flux`;
    $('kickerText').textContent = `即将前往 ${CATS[s.cat] ? CATS[s.cat].label : '第三方网站'}`;
  }

  function escapeHtml(v) {
    return String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function renderRelated() {
    if (!site || !Array.isArray(SITES)) return;
    const cat = site.cat;
    const same = SITES.filter(s => s.cat === cat && s.url !== site.url && /^https?:\/\//.test(s.url));
    const list = same.slice(0, 6);
    const meta = $('relMeta');
    if (meta) meta.textContent = CATS[cat] ? CATS[cat].label : '';
    const el = $('relatedList');
    if (!el) return;
    if (!list.length) {
      el.innerHTML = '<p style="font-size:11.5px;color:var(--text-d);padding:8px 4px">暂无同类推荐</p>';
      return;
    }
    el.innerHTML = list.map(s => `
      <a class="rel-item" href="go.html?u=${encodeURIComponent(s.url)}">
        <span class="rel-ico">${iconHtml(s)}</span>
        <span class="rel-body">
          <span class="rel-name">${escapeHtml(s.name)}</span>
          <span class="rel-desc">${escapeHtml(hostOf(s.url))}</span>
        </span>
        <span class="rel-go" aria-hidden="true">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>
        </span>
      </a>`).join('');
  }

  let recCat = '';
  function renderMore() {
    if (!Array.isArray(SITES)) return;
    const chips = $('catChips');
    const grid = $('recGrid');
    if (!chips || !grid) return;

    const cats = (typeof CATS !== 'undefined') ? Object.keys(CATS) : [];
    chips.innerHTML = cats.slice(0, 8).map(c =>
      `<a class="cat-chip${c === recCat ? ' active' : ''}" href="index.html?cat=${c}">${CATS[c].icon} ${CATS[c].label}</a>`
    ).join('');

    const pool = SITES.filter(s => s.url !== (site && site.url) && /^https?:\/\//.test(s.url) && (!recCat || s.cat === recCat));
    // 洗牌取 8 个：每次进入页面推荐都不同，而不是固定前 8 个
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const picks = pool.slice(0, 8);
    grid.innerHTML = picks.map(s => `
      <a class="rec-card" href="go.html?u=${encodeURIComponent(s.url)}">
        <span class="rec-ico">${iconHtml(s)}</span>
        <span class="rec-body">
          <span class="rec-name">${escapeHtml(s.name)}</span>
          <span class="rec-desc">${escapeHtml(descOf(s))}</span>
        </span>
      </a>`).join('');
    $('moreMeta').textContent = recCat && CATS[recCat] ? CATS[recCat].label : '热门站点';
  }

  // ── 倒计时 / 跳转 ──
  const RING_LEN = 2 * Math.PI * 19;
  const PAGE_HREF = location.href;
  let jumpLock = false;

  function updateTimerUI() {
    const total = Math.max(1, Number(window.GO_PAGE && window.GO_PAGE.countdown) || 8);
    $('ringNum').textContent = paused ? '⏸' : countdown;
    $('ringFill').style.strokeDashoffset = String(RING_LEN * (1 - countdown / total));
    $('timerText').textContent = paused
      ? '自动跳转已暂停'
      : `页面将在 ${countdown} 秒后自动前往`;
    $('timerSub').textContent = paused
      ? '点击「继续」恢复倒计时'
      : '如不希望等待，可点击「立即前往」';
    $('timerRow').classList.toggle('paused', paused);
    // 最后 3 秒紧迫提示
    $('timerRow').classList.toggle('urgent', !paused && countdown <= 3 && countdown > 0);
    const btn = $('pauseBtn');
    btn.textContent = paused ? '继续倒计时' : '暂停自动跳转';
    btn.classList.toggle('resume', paused);
  }

  function startCountdown() {
    const total = Math.max(0, Number(window.GO_PAGE && window.GO_PAGE.countdown) || 0);
    if (!total) {
      $('timerRow').hidden = true;
      return;
    }
    countdown = total;
    $('ringFill').style.strokeDasharray = String(RING_LEN);
    updateTimerUI();
    clearInterval(timer);
    timer = setInterval(() => {
      if (paused) return;
      countdown -= 1;
      if (countdown <= 0) {
        clearInterval(timer);
        goNow();
        return;
      }
      updateTimerUI();
    }, 1000);
  }

  function goNow() {
    if (!site) return;
    clearInterval(timer);

    // 兜底态：自动跳转被拦截过 → 改为新标签打开
    if (jumpLock === 'fallback') {
      window.open(site.url, '_blank', 'noopener');
      return;
    }
    // 跳转中：防止重复点击
    if (jumpLock) return;
    jumpLock = true;
    $('goNow').classList.add('busy');
    $('goNowLabel').textContent = '正在前往…';
    $('timerText').textContent = '正在跳转…';

    const target = site.url;

    // 主跳转
    try {
      location.href = target;
    } catch (e) {
      try { window.open(target, '_blank', 'noopener'); } catch (e2) { /* 忽略，走下方兜底 */ }
    }

    // 兜底：若 2.5 秒后仍在当前页（跳转被拦截），给出新窗口方案
    setTimeout(() => {
      if (location.href !== PAGE_HREF) return;
      jumpLock = 'fallback';
      $('goNow').classList.remove('busy');
      $('goNow').classList.add('fallback');
      $('goNowLabel').textContent = '在新标签打开';
      $('timerText').textContent = '自动跳转被拦截，请点击按钮打开';
      $('timerSub').textContent = '部分浏览器或网络环境会限制自动跳转';
    }, 2500);
  }

  function togglePause() {
    paused = !paused;
    updateTimerUI();
  }

  function copyLink() {
    if (!site) return;
    const text = site.url;
    const btn = $('copyBtn');
    const done = () => {
      showToast('链接已复制');
      if (btn) {
        btn.classList.add('copied');
        setTimeout(() => btn.classList.remove('copied'), 1600);
      }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) {}
    ta.remove();
  }
  let toastTimer = null;
  function showToast(msg) {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2000);
  }

  // ── 广告位 ──
  function renderAds() {
    const cfg = window.GO_ADS || {};
    const test = new URLSearchParams(location.search).get('adtest') === '1';
    const slots = ['top', 'side', 'native', 'mobile'];
    let hasReal = false;
    let mobileLive = false;

    slots.forEach(name => {
      const el = $('ad-' + name);
      if (!el) return;
      const body = el.querySelector('.ad-body');
      const slotId = (cfg.slots || {})[name];
      const custom = (cfg.custom || {})[name];

      if (custom) {
        body.innerHTML = custom;
        el.hidden = false;
        hasReal = true;
        if (name === 'mobile') mobileLive = true;
        return;
      }
      if (slotId && cfg.client) {
        body.innerHTML = `<ins class="adsbygoogle" style="display:block;width:100%"
          data-ad-client="${cfg.client}" data-ad-slot="${slotId}"
          data-ad-format="${name === 'native' ? 'auto' : 'auto'}"
          data-full-width-responsive="true"></ins>`;
        el.hidden = false;
        hasReal = true;
        if (name === 'mobile') mobileLive = true;
        return;
      }
      if (test) {
        el.hidden = false;
        body.dataset.slot = name;
        document.body.classList.add('ad-test');
      }
    });

    const mobileWrap = $('adMobileWrap');
    if (mobileWrap) mobileWrap.style.display = mobileLive ? '' : 'none';
    if (mobileLive) document.body.classList.add('has-mobile-ad');

    if (hasReal) {
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(cfg.client);
      s.crossOrigin = 'anonymous';
      let pushed = false;
      s.onload = () => {
        if (pushed) return;
        pushed = true;
        document.querySelectorAll('ins.adsbygoogle').forEach(() => {
          try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
        });
      };
      // 脚本加载失败（被墙/拦截）→ 隐藏空广告位，不留白框
      s.onerror = () => {
        slots.forEach(name => {
          const el = $('ad-' + name);
          if (el && el.querySelector('ins.adsbygoogle')) el.hidden = true;
        });
        const wrap = $('adMobileWrap');
        if (wrap) wrap.style.display = 'none';
        document.body.classList.remove('has-mobile-ad');
      };
      document.head.appendChild(s);
      // 双保险：4 秒后脚本仍未就绪也按失败处理
      setTimeout(() => {
        if (!pushed && !(window.adsbygoogle && window.adsbygoogle.loaded)) s.onerror && s.onerror();
      }, 4000);
    }

    if (test) {
      const banner = document.createElement('div');
      banner.className = 'adtest-banner';
      banner.innerHTML = '<div>广告预览模式：以上灰色斜纹区域为广告位。填入 <b>GO_ADS.slots</b> 后即可上线，空配置时自动隐藏。</div>';
      const head = document.querySelector('.g-head');
      head.parentNode.insertBefore(banner, head.nextSibling);
    }
  }

  // ── 主题 ──
  function initTheme() {
    const btn = $('themeBtn');
    const ico = $('themeIco');
    const sync = () => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (ico) ico.textContent = dark ? '☀️' : '🌙';
    };
    sync();
    if (btn) btn.addEventListener('click', () => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      const next = dark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('navhub-theme', next);
      sync();
    });
  }

  // ── 初始化 ──
  function init() {
    applyConfig();
    if (Array.isArray(SITES)) SITES.forEach(enrichTags);

    site = resolveSite();
    initTheme();
    renderAds();

    if (!site) {
      $('goCard').classList.add('invalid');
      $('invalidState').hidden = false;
      $('siteName').textContent = '无效的跳转链接';
      $('siteDesc').textContent = '请返回 Flux 导航，从站点卡片重新进入。';
      $('siteHost').textContent = '—';
      $('kickerText').textContent = '链接无法识别';
      return;
    }

    renderSite(site);
    renderRelated();
    renderMore();
    startCountdown();

    // 主按钮是真链接（脚本失效也能点通），JS 只负责增强：阻止默认 + 受控跳转
    const goBtn = $('goNow');
    goBtn.setAttribute('href', site.url);
    goBtn.setAttribute('target', '_blank');
    goBtn.setAttribute('rel', 'noopener nofollow');
    goBtn.addEventListener('click', e => {
      // 兜底态：让浏览器原生行为接管（target=_blank 新标签打开）
      if (jumpLock === 'fallback') return;
      e.preventDefault();
      goNow();
    });
    $('pauseBtn').addEventListener('click', togglePause);
    $('copyBtn').addEventListener('click', copyLink);

    document.addEventListener('keydown', e => {
      if (!site) return; // 无效链接页：不拦截任何按键
      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); goNow(); }
      if (e.key === ' ') { e.preventDefault(); togglePause(); }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
