# 导航站图标：全量本地化 + 修复「全部变默认」

## 问题
上一轮把每个站点图标设成**本地占位地球** `icons/_ph_*.svg`，且 `faviconSources` 把本地 img 放在**第一位** → 占位永远先加载成功，网络真实图标再也不会被尝试 → **所有图标都变成地球**。

## 修复
1. **`main.js` → `faviconSources(s)` 顺序修正**
   - 已有**真实**本地图标 → 本地优先、网络兜底
   - 只有占位 `_ph_` → **网络真实图标优先**（站点根 / Google s2 / **icon.horse** / DDG / Clearbit / Bing），**占位放最后**兜底
2. **真实图标落地到本地**
   - 发现沙箱**有代理**，`curl` 可出网；`icon.horse` 可达且给真实图标
   - 用 `curl` 从 icon.horse 下载，并以「首字母默认图 md5 对照表」**剔除它生成的字母头像默认图**
   - 两轮（含超时重试）共下载 **426** 个真实图标 → `icons/<id>.<ext>`

## 结果（data.js 534 站）
| 项目 | 数量 |
|---|---|
| 真实本地图标 | **426**（186 ico / 234 png / 6 svg）|
| 地球占位（icon.horse 确无真实图标）| 108 |
| 引用断链 | **0** |

- `node --check data.js` / `main.js` 通过
- 备份：`data.js.bak.preicon`

## 效果
绝大多数卡片恢复**真实品牌图标**且为本地文件（离线/CSP 均可用）；仅 108 个 icon.horse 无收录的站保留地球，页面仍会先尝试网络真实图标。

## 可选后续
本机有网时运行 `node tools/fetch-icons.mjs` 可再补齐剩余站点的真实图标。

---

# 安全跳转页（go.html）— 重新设计

## 背景
原先点击卡片弹出的是**简易预览弹层**（新标签 / iframe / ESC 关闭）。问题：
- 弹层结构简陋，视觉上就是一个遮罩 + 空 iframe
- 没有任何广告承载位，后续无法变现
- iframe 被目标站 `X-Frame-Options` 拦截时是空白框，体验割裂

## 方案：独立跳转页
废弃弹层，改为**独立页面 `go.html`**，卡片点击进入该页，页面完成倒计时后自动跳转目标站。

### 页面结构（`go.html` + `go.css` + `go.js`）
| 区块 | 说明 |
|---|---|
| 顶部横幅广告位 | `ad-top`，970×90 / 移动端 320×100 |
| 主卡片 | 站点图标 + 名称 + 域名 + 徽章 + 描述 + 标签 |
| 安全提示条 | 离开前提醒，不承担信任背书 |
| 操作区 | 立即前往 / 暂停倒计时 / 复制链接 |
| 倒计时环 | SVG 圆环进度，8 秒自动跳转 |
| 右侧广告位 | `ad-side`，300×250 |
| 相似推荐 | 同分类站点，可继续跳转 |
| 信息流广告位 | `ad-native`，自适应 |
| 推荐网格 | 8 个热门站点 + 分类快捷 chip |
| 移动端底部广告 | `ad-mobile`，320×50 / 320×100，可关闭 |

### 广告位配置
统一在 `go.html` 顶部的 `window.GO_ADS` 中配置：

```js
window.GO_ADS = {
  client: 'ca-pub-5282340125650399',
  slots:   { top: '', side: '', native: '', mobile: '' },  // AdSense slot id
  custom:  { top: '', side: '', native: '', mobile: '' }   // 任意 HTML 片段（联盟/直客）
};
```

- `slots` 填 slot id → 走 AdSense
- `custom` 填 HTML → 走自建/联盟广告，优先级更高
- 两者都空 → 广告位自动隐藏，不占版面
- 预览布局：网址后加 `?adtest=1`，显示灰色斜纹占位

### 跳转行为
- `window.GO_PAGE.countdown` 控制倒计时秒数（默认 8），设为 `0` 则只显示按钮不自动跳
- 目标地址通过 `?u=<encoded url>` 传入；也兼容 `?id=<site id>`
- 仅接受 `http/https` 协议，其余（`javascript:` 等）判定为无效链接并展示兜底页
- 键盘：`Enter` 立即跳转，`空格` 暂停/继续

### 接入改动
- `main.js` → 新增 `goUrl(url)`，`buildCard` / 精选卡 / 精选位三类链接统一改为 `go.html?u=...`
- 删除 `openPreview` / `togglePreviewIframe` / `openPreviewInNewTab` / `closePreview` / `bindPreviewChrome` 及对应 HTML、CSS
- `robots.txt` 增加 `Disallow: /go.html`（跳转页 `noindex`，不进入索引）

## 验证
- `node --check main.js go.js data.js config.js` 全部通过
- 桌面 1440 / 移动 390 / 暗色主题截图确认无溢出与错位
- 首页点击卡片 → 跳转页显示正确站点名；非法协议显示无效态
