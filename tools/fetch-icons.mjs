// ═══════════════════════════════════════════════════════════════
// fetch-icons.mjs — 把导航站点的图标保存到本地 icons/，并写回 data.js
//
// 用法：
//   ① 离线（沙箱/无网环境，立即让页面 100% 本地化，全部用本地地球占位）：
//        node tools/fetch-icons.mjs --offline
//   ② 在线（有网的本机，下载真实品牌图标；已占位(._ph_)的站点会被升级为真实图标）：
//        node tools/fetch-icons.mjs
//   ③ 跳过网络预检：node tools/fetch-icons.mjs --skip-preflight
//
// 设计要点：
//   - 每个站点最终都拥有一个本地 img：能解析到真实图标就存真实图标(icons/<id>.<ext>)；
//     解析不到就生成本地地球占位(icons/_ph_<id>.svg)，绝不留空、绝不留外链。
//   - 真实图标文件名不带 _ph_ 前缀；占位文件名以 _ph_ 前缀，便于在线模式识别并升级。
//   - 幂等：已存在真实本地图标的站点直接跳过；_ph_ 占位站点在线时会被真实图标覆盖。
//   - 运行前自动备份 data.js → data.js.bak。
// ═══════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root       = path.resolve(__dirname, '..');        // navigation/
const dataPath   = path.join(root, 'data.js');
const iconsDir   = path.join(root, 'icons');
const backupPath = dataPath + '.bak';

const UA        = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const CONCURRENCY = 12;
const TIMEOUT_MS  = 7000;
const MIN_BYTES   = 64;                                   // 小于此视为空图/占位
const PLACEHOLDER_PREFIX = '_ph_';

function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function hostOf(url) { try { return new URL(url).hostname; } catch { return url; } }

// 真实图标候选源（按“质量+覆盖”排序；Google s2 / Bing 对无图标域会回默认地球，需靠体积 Guard 过滤）
function sourcesFor(url) {
  const h = hostOf(url);
  return [
    `https://icon.horse/icon/${h}`,                          // 解析力强、128px
    `https://www.google.com/s2/favicons?domain=${h}&sz=128`,   // 覆盖最广、极稳
    `https://${h}/favicon.ico`,                               // 官方根 favicon
    `https://icons.duckduckgo.com/ip3/${h}.ico`,              // DDG
    `https://logo.clearbit.com/${h}`,                         // Clearbit 公司 logo
    `https://www.bing.com/favicon.ico?url=${h}`,              // Bing 兜底
  ];
}
function extFor(ct) {
  if (!ct) return 'ico';
  if (ct.includes('svg'))  return 'svg';
  if (ct.includes('png'))  return 'png';
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg';
  if (ct.includes('webp')) return 'webp';
  if (ct.includes('gif'))  return 'gif';
  if (ct.includes('x-icon') || ct.includes('icon')) return 'ico';
  return 'ico';
}

// 生成本地地球占位 SVG（按 id+name 哈希取色，圆角方块 + 经纬线地球，作为“默认图标”）
function genPlaceholder(id, name, url) {
  const label = (name || hostOf(url) || id || '?').trim().charAt(0).toUpperCase() || '?';
  let h = 0; for (const c of (id + name)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const hue = h % 360;
  const bg  = `hsl(${hue} 58% 45%)`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">` +
    `<rect width="64" height="64" rx="14" fill="${bg}"/>` +
    `<g fill="none" stroke="rgba(255,255,255,.92)" stroke-width="2.6" stroke-linecap="round">` +
    `<circle cx="32" cy="32" r="15"/>` +
    `<ellipse cx="32" cy="32" rx="6.5" ry="15"/>` +
    `<line x1="17" y1="32" x2="47" y2="32"/>` +
    `<path d="M19.5 24.5 Q26 20 32.5 24 T45 24.5"/>` +
    `<path d="M19.5 39.5 Q26 44 32.5 40 T45 39.5"/>` +
    `</g></svg>`;
}

async function fetchIcon(url) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const r = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': UA, 'Accept': 'image/avif,image/webp,image/png,image/svg+xml,image/*,*/*;q=0.8' },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < MIN_BYTES) return null;
    const ct = r.headers.get('content-type') || '';
    // Google/Bing 对“无图标域名”会回默认灰色地球（200），体积偏小 → 不缓存，避免污染
    if (/google\.com\/s2\/favicons|bing\.com\/favicon/.test(url) && extFor(ct) === 'png' && buf.length < 700) return null;
    return { buf, ext: extFor(ct) };
  } catch {
    return null;
  }
}

// 网络预检：连不上外网就退出并给出指引
async function preflight() {
  const probe = 'https://icons.duckduckgo.com/ip3/openai.com.ico';
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5000);
  try {
    await fetch(probe, { signal: ctrl.signal, method: 'GET' });
    clearTimeout(t);
    console.log('✓ 网络连通，开始下载真实图标…');
  } catch (e) {
    clearTimeout(t);
    console.error('✗ 无法连接外网（' + ((e.cause && e.cause.code) || e.message) + '）。');
    console.error('  请在有互联网的机器上运行；或在无网环境用：node tools/fetch-icons.mjs --offline');
    process.exit(2);
  }
}

function parseSites(src) {
  const lines = src.split('\n');
  const targets = [];
  lines.forEach((line) => {
    const idM  = line.match(/id:'((?:[^'\\]|\\.)*)'/);
    const urlM = line.match(/url:'((?:[^'\\]|\\.)*)'/);
    if (idM && urlM) {
      const imgM = line.match(/img:'((?:[^'\\]|\\.)*)'/);
      targets.push({ line, id: idM[1], url: urlM[1], img: imgM ? imgM[1] : null });
    }
  });
  return { lines, targets };
}

function isPlaceholder(p) { return !!p && path.basename(p).startsWith(PLACEHOLDER_PREFIX); }
function realIconExists(p) {
  if (!p || isPlaceholder(p)) return false;
  try { return fs.statSync(path.join(root, p)).size >= MIN_BYTES; } catch { return false; }
}

async function main() {
  const offline = process.argv.includes('--offline');
  if (!fs.existsSync(dataPath)) { console.error('找不到 data.js:', dataPath); process.exit(1); }
  if (!offline && !process.argv.includes('--skip-preflight')) await preflight();

  fs.mkdirSync(iconsDir, { recursive: true });
  fs.copyFileSync(dataPath, backupPath);                    // 始终先备份当前 data.js

  const src = fs.readFileSync(dataPath, 'utf8');
  const { lines, targets } = parseSites(src);
  console.log(`解析到 ${targets.length} 个站点（${offline ? '离线模式 · 仅生成本地占位' : '在线模式 · 真实图标优先'}）`);

  // 每个站点的最终 img 路径映射：id -> 本地相对路径
  const imgMap = new Map();

  if (offline) {
    // 离线：真实图标不存在(或非占位)的站点一律生成本地地球占位
    let made = 0;
    for (const t of targets) {
      if (realIconExists(t.img)) { imgMap.set(t.id, t.img); continue; }   // 已有真实图标，保留
      const file = `icons/${PLACEHOLDER_PREFIX}${t.id}.svg`;
      fs.writeFileSync(path.join(root, file), genPlaceholder(t.id, '', t.url));
      imgMap.set(t.id, file); made++;
    }
    console.log(`生成本地占位 ${made} 个`);
  } else {
    // 在线：已真实图标跳过；其余尝试下载真实图标，失败则确保占位存在
    let downloaded = 0, upgraded = 0, placeholder = 0;
    const queue = targets.filter(t => !realIconExists(t.img));
    let done = 0;
    const worker = async () => {
      while (queue.length) {
        const t = queue.shift();
        let saved = null;
        for (const u of sourcesFor(t.url)) {
          const res = await fetchIcon(u);
          if (res) { saved = { file: `icons/${t.id}.${res.ext}`, buf: res.buf }; break; }
        }
        if (saved) {
          fs.writeFileSync(path.join(root, saved.file), saved.buf);
          // 清理旧的占位文件（若有）
          const oldPh = `icons/${PLACEHOLDER_PREFIX}${t.id}.svg`;
          if (fs.existsSync(path.join(root, oldPh))) { try { fs.unlinkSync(path.join(root, oldPh)); } catch {} }
          imgMap.set(t.id, saved.file);
          downloaded++; if (isPlaceholder(t.img)) upgraded++;
        } else {
          const file = `icons/${PLACEHOLDER_PREFIX}${t.id}.svg`;
          if (!fs.existsSync(path.join(root, file))) fs.writeFileSync(path.join(root, file), genPlaceholder(t.id, '', t.url));
          imgMap.set(t.id, file); placeholder++;
        }
        done++;
        if (done % 25 === 0) process.stdout.write(`\r进度 ${done}/${queue.length + (targets.length - queue.length)}`);
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker));
    console.log(`\n真实图标：${downloaded} 个（其中升级占位 ${upgraded} 个）；仍用本地占位：${placeholder} 个`);
  }

  // 写回 data.js：在对应行插入/更新 img 字段
  const isPlaceholderRef = (p) => isPlaceholder(p);
  const outLines = lines.map(line => {
    const idM = line.match(/id:'((?:[^'\\]|\\.)*)'/);
    if (!idM) return line;
    const id = idM[1];
    const file = imgMap.get(id);
    if (!file) return line;
    const pat = new RegExp(`id:'${escapeRegExp(id)}',`);
    const withImg = `id:'${id}',img:'${file}',`;
    if (/img:'/.test(line)) {
      // 已有 img：若与新值不同且新值是真实图标(或旧的是占位)，则覆盖；否则保留
      const cur = (line.match(/img:'((?:[^'\\]|\\.)*)'/))?.[1];
      if (cur === file) return line;
      if (isPlaceholderRef(cur) || !isPlaceholderRef(file)) {
        return line.replace(/img:'((?:[^'\\]|\\.)*)'/, `img:'${file}'`);
      }
      return line;
    }
    return line.replace(pat, withImg);
  });
  fs.writeFileSync(dataPath, outLines.join('\n'));

  console.log(`✅ 完成：data.js 现已为全部 ${targets.length} 个站点写入本地 img 引用。`);
  console.log(`   图标目录：${iconsDir}`);
  console.log(`   备份文件：data.js.bak（回滚：cp data.js.bak data.js）`);
  if (offline) console.log(`   提示：在联网机器上运行 node tools/fetch-icons.mjs 可将占位升级为真实品牌图标。`);
}

main().catch(e => { console.error('运行出错：', e); process.exit(1); });
