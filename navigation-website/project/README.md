# 个人导航站 - Project Nexus

一个高颜值的个人导航网站，零后端依赖，数据存储在 JSON 文件中。

## 特性

- 🎨 现代简约设计 (参考 Ray.so / Linear)
- 📱 移动端优先响应式设计
- 🌓 深色/浅色主题自动跟随系统 + 手动切换
- 🔍 顶部搜索即时过滤
- 🏷️ 分类标签筛选
- ⚡ 卡片悬停微动效，加载快速
- 🖼️ 自动获取网站 Favicon (Google Favicon API)

## 技术栈

- 纯 HTML + CSS + JavaScript
- 无需后端，JSON 数据存储
- 可直接部署到 GitHub Pages / Cloudflare Pages / Vercel

## 使用方法

1. 编辑 `data/sites.json` 添加自己的书签
2. 本地预览: 直接用浏览器打开 `index.html` 或使用 Live Server

## 部署

### GitHub Pages
1. 推送代码到 GitHub 仓库
2. Settings → Pages → Deploy from main branch

### Vercel
```bash
npm i -g vercel
vercel
```

### Cloudflare Pages
1. 连接到 GitHub 仓库
2. 构建命令: 留空
3. 输出目录: ./
