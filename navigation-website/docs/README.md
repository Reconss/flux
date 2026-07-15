# 技术实现方案

## 技术架构

```
导航网站
├── Hugo (生成器)
├── Bootstrap 5 (样式框架)
├── 数据格式 (JSON)
└── 部署 (Vercel/GitHub Pages)
```

## 项目结构

```
navigation-website/
├── config.toml            # Hugo 配置文件
├── config/                 # 站点配置
│   └── menus.toml         # 导航菜单
├── content/               # 页面内容
│   ├── index.md           # 首页
│   └── education/         # 教育分类页
│   ├── developer/         # 技术分类页
│   ├── tools/             # 工具分类页
│   └── entertainment/      # 娱乐分类页
├── data/                  # 静态数据
│   ├── education.json     # 教育数据
│   ├── developer.json     # 技术数据
│   ├── tools.json         # 工具数据
│   └── entertainment.json # 娱乐数据
├── layouts/               # 页面模板
│   ├── index.html         # 首页模板
│   ├── list.html          # 列表页模板
│   ├── partials/          # 组件
│   │   ├── navbar.html    # 导航栏
│   │   ├── footer.html    # 页脚
│   │   └── card.html      # 卡片组件
├── static/                # 静态资源
│   ├── css/
│   │   └── style.css      # 自定义样式
│   ├── images/
│   └── favicon.ico
└── schemas/               # 数据格式说明
    └── website.json        # 站点数据结构
```

## 配置文件 (config.toml)

```toml
baseURL = 'https://yourdomain.com/'
languageCode = 'zh-CN'
title = '中文资源导航'
theme = 'ananke'

# 导航菜单
[params]
  github_repo = 'yourname/nav-site'
  title = '中文资源导航'
  subtitle = '合法、免费、中文友好'

[menus]
  main = [
    { name = '首页', url = '/', weight = 1 },
    { name = '教育学习', url = '/education/', weight = 2 },
    { name = '开发技术', url = '/developer/', weight = 3 },
    { name = '生活实用', url = '/tools/', weight = 4 },
    { name = '资讯娱乐', url = '/entertainment/', weight = 5 },
  ]
```

## 数据格式 (JSON)

```json
[
  {
    "name": "网站名称",
    "url": "https://example.com",
    "description": "网站描述",
    "category": "education",
    "tags": ["在线课程", "免费", "英语"],
    "rating": 5,
    "language": "中文"
  }
]
```

## 页面模板

### index.html

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <title>{{ .Title }}</title>
</head>
<body>
    {{ partial 'navbar.html' . }}
    <main>{{ .Content }}</main>
    {{ partial 'footer.html' . }}
</body>
</html>
```

### list.html (分类列表页)

```html
{{ define "main" }}
  <h1>{{ .Title }}</h1>
  {{ range .Data.Pages }}
    {{ partial 'card.html' . }}
  {{ end }}
{{ end }}
```

### card.html (卡片组件)

```html
{{ $site := .Data.Pages.Params }}
<div class="card">
  <h3><a href="{{ $site.url }}">{{ $site.name }}</a></h3>
  <p>{{ $site.description }}</p>
</div>
```

## 部署方案

### 方案一: GitHub Pages

1. 创建 GitHub 仓库
2. 仓库中创建 `index.html`
3. 部署设置文件

```yaml
# .github/workflows/deploy.yml
name: Deploy Hugo Site
on:
  push:
    branches: [ main ]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v2
        with:
          hugo-version: 'latest'
      - name: Build
        run: hugo
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
```

### 方案二: Vercel (推荐)

1. 在 Vercel 创建项目
2. 选择 Hugo 作为框架
3. 自动部署

### 方案三: Netlify

1. 导入 Git 仓库
2. 配置构建设置
3. 自动部署

## 增强功能
* 资源搜索功能 (Algolia/Google Custom Search)
* 响应式设计 (移动端适配)
* 深色模式支持
* 评分系统
TAG filtering
EOF
