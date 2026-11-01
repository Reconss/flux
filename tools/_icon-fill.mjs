// 多源 favicon 补全：为仍是 _ph_ 占位的站点抓取真实图标。
// 原理：对每个站点按优先级依次尝试多个源；每个候选图标都要通过
// "真实图片校验 + 默认图签名剔除" 才会被采纳。
// 默认图签名库在启动时用一批不存在的域名跨源探测自动生成，避免误收默认图。
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const DATA = 'data.js';
const ICON_DIR = 'icons';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

// 一批必然不存在的域名：用于探测各源的"默认图"指纹
const BOGUS = [
  'random1xyz123.com', 'qqqq-not-real-999.net', 'asdfghjkl-000.net', 'zzz-000-xyz.io',
  'notreal12345.com', 'thisisnotarealdomain99999.org', 'bogus-nope-12345.net',
  'qqq-zzz-000.info', 'xyzbogus00000.com', 'nonexistent-abcdef.io',
  'mno-abcd-0000.xyz', 'aaa-zzz-nope-111.co', 'fake-domain-77.net', 'no-such-host-88.org',
];
// 覆盖 a-z0-9 的假域名（用于 icon.horse 首字母默认头像表）
const LETTERS = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');

const TMP = '/tmp/_icf';
fs.mkdirSync(TMP, { recursive: true });
if (!fs.existsSync(ICON_DIR)) fs.mkdirSync(ICON_DIR, { recursive: true });

function curl(url, out, timeout = 15) {
  const cmd = `curl -s -L --max-time ${timeout} -A "${UA}" -o "${out}" -w "%{http_code}|%{content_type}" "${url}"`;
  try { return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return 'ERR||'; }
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
const OK_KINDS = new Set(['png', 'ico', 'jpg', 'webp', 'gif', 'svg']);
const EXT = { png: 'png', ico: 'ico', jpg: 'jpg', webp: 'webp', gif: 'gif', svg: 'svg' };

// 站点 -> 源列表（优先级从高到低）
function sourcesFor(host) {
  return [
    { name: 'direct', url: `https://${host}/favicon.ico` },
    { name: 'xinac', url: `https://api.xinac.net/icon/?url=${host}` },
    { name: 'cccyun', url: `https://favicon.cccyun.cc/${host}` },
    { name: 'favicone', url: `https://favicone.com/${host}?s=128` },
    { name: 'zhusl', url: `https://favicon.zhusl.com/ico?url=${host}` },
  ];
}

// 一些知名品牌的矢量图标（iconify simple-icons），质量高、体积小
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
  'uniontech.com': 'simple-icons:linuxdeepin', 'saucenao.com': 'simple-icons:saucenao',
  'discord.com': 'simple-icons:discord', 'patreon.com': 'simple-icons:patreon',
};
function brandSvg(slug, out) {
  const [set, name] = slug.split(':');
  const code = curl(`https://api.iconify.design/${set}:${name}.svg?height=128`, out, 10);
  return code.startsWith('200') && kind(out) === 'svg';
}

async function main() {
  // 1) 构建默认图签名库
  console.log('== 探测默认图签名 ==');
  const bad = new Set();
  const bogusAll = [...new Set([...BOGUS, ...LETTERS.map(c => `no-such-${c}-0000.invalid`)])];
  for (const h of bogusAll) {
    for (const { name, url } of sourcesFor(h)) {
      curl(url, path.join(TMP, 'b.bin'), 8);
      const m = md5(path.join(TMP, 'b.bin'));
      if (m && fsize(path.join(TMP, 'b.bin')) > 0) bad.add(m);
    }
    // icon.horse 首字母默认头像
    curl(`https://icon.horse/icon/${h}`, path.join(TMP, 'b.bin'), 8);
    const m2 = md5(path.join(TMP, 'b.bin'));
    if (m2 && fsize(path.join(TMP, 'b.bin')) > 0) bad.add(m2);
  }
  console.log('默认图签名数:', bad.size);

  // 2) 读取待补站点
  const data = fs.readFileSync(DATA, 'utf8');
  const re = /\{id:'([^']+)',img:'icons\/_ph_[^']+',name:'([^']*)',url:'([^']+)'/g;
  const targets = [];
  let m;
  while ((m = re.exec(data))) {
    let host = '';
    try { host = new URL(m[3]).hostname; } catch {}
    if (host) targets.push({ id: m[1], name: m[2], url: m[3], host });
  }
  console.log('待补站点:', targets.length);

  fs.mkdirSync('icons', { recursive: true });
  const results = [];
  let i = 0;
  for (const t of targets) {
    i++;
    let saved = null;
    // 品牌矢量优先
    if (BRAND[t.host]) {
      const out = path.join(TMP, 'brand.svg');
      if (brandSvg(BRAND[t.host], out) && !bad.has(md5(out))) {
        const dest = path.join(ICON_DIR, `${t.id}.svg`);
        fs.copyFileSync(out, dest);
        saved = dest;
      }
    }
    if (!saved) {
      for (const { name, url } of sourcesFor(t.host)) {
        const out = path.join(TMP, 'c.bin');
        curl(url, out, 15);
        const k = kind(out), sz = fsize(out), h = md5(out);
        if (!OK_KINDS.has(k) || sz < 60 || !h || bad.has(h)) continue;
        const dest = path.join(ICON_DIR, `${t.id}.${EXT[k]}`);
        fs.copyFileSync(out, dest);
        saved = dest; break;
      }
    }
    results.push({ ...t, saved });
    console.log(`[${i}/${targets.length}] ${t.id} -> ${saved ? path.basename(saved) : 'MISS'}`);
  }

  // 3) 回写 data.js
  let out = data;
  let n = 0;
  for (const r of results) {
    if (!r.saved) continue;
    const phOld = `img:'icons/_ph_${r.id}.svg'`;
    const phNew = `img:'${r.saved.replace(/\\/g, '/')}'`;
    if (out.includes(phOld)) { out = out.replace(phOld, phNew); n++; }
  }
  if (n > 0) fs.writeFileSync(DATA, out);
  // 清理旧占位文件
  for (const r of results) {
    if (!r.saved) continue;
    const ph = path.join(ICON_DIR, `_ph_${r.id}.svg`);
    if (fs.existsSync(ph)) fs.unlinkSync(ph);
  }

  const ok = results.filter(r => r.saved);
  console.log(`\n== 完成 ==`);
  console.log(`成功补全: ${ok.length}/${results.length}`);
  console.log(`仍未获取: ${results.length - ok.length}`);
  fs.writeFileSync('/tmp/_icf_result.json', JSON.stringify(results, null, 1));
}

main();
