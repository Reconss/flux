// 确定性 favicon 补全脚本
//
// 背景（踩过的坑）：
//   1) 本机代理存在"缓存串味"：不同域名的 API 请求会返回同一张错图，
//      且同一 URL 连续请求结果不稳定。解决：每个 URL 追加唯一 cache-buster，
//      并且对同一 URL 取两次，只有两次字节完全一致才采纳。
//   2) 部分源对"解析不到"的域名会返回默认图（字母头像 / 品牌占位 / LG 图标等）。
//      解决：启动时用一批不存在的域名跨源探测，生成默认图 md5 黑名单。
//   3) icon.horse 的默认图是"按域名首字母生成的头像"，因此按 a-z0-9 逐一探测建表。
//
// 用法：node tools/_icon-fix.mjs
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const DATA = 'data.js';
const ICON_DIR = 'icons';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const TMP = '/tmp/_icfix';
fs.mkdirSync(TMP, { recursive: true });

const OK_KINDS = new Set(['png', 'ico', 'jpg', 'webp', 'gif', 'svg']);
const EXT = { png: 'png', ico: 'ico', jpg: 'jpg', webp: 'webp', gif: 'gif', svg: 'svg' };

// 二级后缀（用于近似取"主域名"）
const TWO = ['com.cn', 'org.cn', 'net.cn', 'gov.cn', 'com.hk', 'co.uk', 'com.tw', 'org.tw'];
function baseDomain(host) {
  const p = host.split('.');
  if (p.length >= 3 && TWO.includes(p.slice(-2).join('.'))) return p.slice(-3).join('.');
  return p.slice(-2).join('.');
}

function curl(url, out, timeout = 15) {
  const cmd = `curl -s -L --max-time ${timeout} -A "${UA}" -H "Cache-Control: no-store" -o "${out}" -w "%{http_code}" "${url}"`;
  try {
    const code = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return code === '200';
  } catch { return false; }
}
function md5(f) { try { return execSync(`md5 -q "${f}"`, { encoding: 'utf8' }).trim(); } catch { return ''; } }
function fsize(f) { try { return fs.statSync(f).size; } catch { return 0; } }
function kind(f) {
  try {
    const b = fs.readFileSync(f);
    if (b.length === 0) return 'empty';
    if (b.length < 12) return 'tiny';
    if (b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
    if (b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0) return 'ico';
    if (b[0] === 0xff && b[1] === 0xd8) return 'jpg';
    if (b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP') return 'webp';
    if (b.slice(0, 3).toString() === 'GIF') return 'gif';
    const head = b.slice(0, 400).toString('utf8').trim().toLowerCase();
    if (head.startsWith('<svg') || head.startsWith('<?xml')) return 'svg';
    if (head.startsWith('<!doctype') || head.startsWith('<html') || head.includes('<head')) return 'html';
    return 'unknown';
  } catch { return 'err'; }
}

let cbSeq = 0;
function withCb(url) {
  cbSeq++;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}_cb=${Date.now()}${cbSeq}${Math.floor(Math.random() * 1e6)}`;
}

// 稳定抓取：同一 URL 加不同 cache-buster 取两次，md5 必须一致（排除代理串味）
function fetchStable(url, timeout = 15) {
  const a = path.join(TMP, 'a.bin'), b = path.join(TMP, 'b.bin');
  if (!curl(withCb(url), a, timeout)) return null;
  const k1 = kind(a), h1 = md5(a), s1 = fsize(a);
  if (!OK_KINDS.has(k1) || s1 < 60 || !h1) return null;
  if (!curl(withCb(url), b, timeout)) return null;
  const k2 = kind(b), h2 = md5(b);
  if (k1 !== k2 || h1 !== h2) return null;      // 不稳定 / 被串味 → 丢弃
  return { file: a, kind: k1, md5: h1, size: s1 };
}

function sourcesFor(host) {
  return [
    { name: 'direct', url: `https://${host}/favicon.ico` },
    { name: 'xinac', url: `https://api.xinac.net/icon/?url=${host}` },
    { name: 'cccyun', url: `https://favicon.cccyun.cc/${host}` },
    { name: 'horse', url: `https://icon.horse/icon/${host}` },
  ];
}

// 知名品牌的矢量图标（iconify simple-icons），按路径区分，质量高
const BRAND = {
  'openai.com': 'simple-icons:openai', 'chat.openai.com': 'simple-icons:openai',
  'platform.openai.com': 'simple-icons:openai', 'npmjs.com': 'simple-icons:npm',
  'codepen.io': 'simple-icons:codepen', 'freecodecamp.org': 'simple-icons:freecodecamp',
  'pexels.com': 'simple-icons:pexels', 'pixabay.com': 'simple-icons:pixabay',
  'fonts.google.com': 'simple-icons:googlefonts', 'translate.google.cn': 'simple-icons:googletranslate',
  'z-lib.org': 'simple-icons:zlibrary', 'crunchyroll.com': 'simple-icons:crunchyroll',
  'last.fm': 'simple-icons:lastdotfm', 'discogs.com': 'simple-icons:discogs',
  'humblebundle.com': 'simple-icons:humblebundle', 'retroarch.com': 'simple-icons:retroarch',
  '1337x.to': 'simple-icons:1337x', 'typecho.org': 'simple-icons:typecho',
  'gamefaqs.gamespot.com': 'simple-icons:gamefaqs', 'hatena.ne.jp': 'simple-icons:hatenabookmark',
};

function main() {
  // ---------- 1) 构建默认图签名库 ----------
  console.log('== 构建默认图签名库 ==');
  const bad = new Set();
  const bogus = [
    'random1xyz123.com', 'qqqq-not-real-999.net', 'asdfghjkl-000.net',
    'zzz-000-xyz.io', 'notreal12345.com', 'thisisnotarealdomain99999.org',
    'bogus-nope-12345.net', 'qqq-zzz-000.info',
  ];
  for (const h of bogus) {
    for (const { url } of sourcesFor(h)) {
      const r = fetchStable(url, 10);
      if (r) bad.add(r.md5);
    }
  }
  // icon.horse 的默认图是"按 host 首个字母生成的头像"：
  // 必须为每个字母造一个【以该字母开头】的假域名，且要覆盖 www./非 www 两种形态
  const TWO = ['com.cn', 'org.cn', 'net.cn', 'gov.cn', 'com.hk', 'co.uk', 'com.tw', 'org.tw'];
  for (const c of 'abcdefghijklmnopqrstuvwxyz0123456789') {
    for (const h of [`${c}-no-such-0000.invalid`, `www.${c}-no-such-0000.invalid`]) {
      const r = fetchStable(`https://icon.horse/icon/${h}`, 10);
      if (r) bad.add(r.md5);
    }
  }
  console.log('默认图签名数:', bad.size);

  // ---------- 2) 目标站点 ----------
  const data = fs.readFileSync(DATA, 'utf8');
  const targets = [];
  const re = /\{id:'([^']+)',img:'(icons\/_ph_[^']+)',name:'([^']*)',url:'([^']+)'/g;
  let m;
  while ((m = re.exec(data))) {
    let host = '';
    try { host = new URL(m[4]).hostname; } catch {}
    if (host) targets.push({ id: m[1], ph: m[2], name: m[3], url: m[4], host });
  }
  console.log('待补站点:', targets.length);
  fs.mkdirSync(ICON_DIR, { recursive: true });

  // ---------- 3) 逐个解析 ----------
  const results = [];
  const usedMd5 = new Map();   // md5 -> 首个使用该图的 host
  // 安全网：若某张图已被另一个【不同主域】的站点用过，说明很可能是默认图/串味 → 拒绝
  const dupOk = (md5, host) => !usedMd5.has(md5) || baseDomain(usedMd5.get(md5)) === baseDomain(host);

  let i = 0;
  for (const t of targets) {
    i++;
    let got = null, src = '';
    // 品牌矢量优先
    if (BRAND[t.host]) {
      const slug = BRAND[t.host].replace(':', '/');
      const r = fetchStable(`https://api.iconify.design/${slug}.svg?height=128`, 12);
      if (r && r.kind === 'svg' && !bad.has(r.md5) && dupOk(r.md5, t.host)) { got = r; src = 'brand'; }
    }
    if (!got) {
      for (const { name, url } of sourcesFor(t.host)) {
        const r = fetchStable(url, 15);
        if (!r || bad.has(r.md5) || !dupOk(r.md5, t.host)) continue;
        got = r; src = name; break;
      }
    }
    if (got) {
      const dest = path.join(ICON_DIR, `${t.id}.${EXT[got.kind]}`);
      fs.copyFileSync(got.file, dest);
      usedMd5.set(got.md5, t.host);
      results.push({ ...t, saved: dest, src });
    } else {
      results.push({ ...t, saved: null, src: '' });
    }
    if (i % 20 === 0) console.log(`  ...已处理 ${i}/${targets.length}`);
  }

  // ---------- 4) 回写 data.js ----------
  let out = data;
  let n = 0;
  for (const r of results) {
    if (!r.saved) continue;
    const oldRef = `img:'${r.ph}'`;
    const newRef = `img:'${r.saved.replace(/\\/g, '/')}'`;
    if (out.includes(oldRef)) { out = out.replace(oldRef, newRef); n++; }
  }
  fs.writeFileSync(DATA, out);

  const ok = results.filter(r => r.saved);
  console.log(`\n== 完成 ==`);
  console.log(`成功补全: ${ok.length}/${results.length}`);
  console.log(`仍为占位: ${results.length - ok.length}`);
  const bySrc = {};
  for (const r of ok) bySrc[r.src] = (bySrc[r.src] || 0) + 1;
  console.log('来源分布:', JSON.stringify(bySrc));
  fs.writeFileSync('/tmp/_icfix_result.json', JSON.stringify(results, null, 1));
}

main();
