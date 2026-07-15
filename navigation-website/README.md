# 中文资源导航网站项目 📚

> 基于合法资源整合的中文用户导航网站

## 🌟 项目特色

- ✅ **合法合规** - 所有资源均为合法、免费、开源服务
- 📱 **中文友好** - 专为中文用户设计的资源聚合平台
- 🔍 **智能分类** - 四大分类覆盖学习、技术、生活、娱乐
- 🚀 **快速访问** - 静态生成，全球 CDN 加速
- 🎨 **响应式设计** - PC/平板/手机完美适配
- 🌓 **深色模式** - 纯 CSS 实现主题切换
- 📊 **数据驱动** - JSON 格式，易于维护和扩展

## 📁 项目结构

```
navigation-website/
├── 📖 README.md                         # 项目说明
├── 📋 实施计划.md                       # 详细实施指南
├── ⚙️ config.toml                       # Hugo 配置
├── 🧠 方案文档.md                       # 整体方案设计
├── 📚 docs/                             # 详细文档目录
│   ├── 01-教育学习.md                   # 教育资源列表
│   ├── 02-开发技术.md                   # 技术资源列表
│   ├── 03-生活实用.md                   # 实用工具列表
│   ├── 04-资讯娱乐.md                   # 娱乐资讯列表
│   └── 05-FMHY学习.md                   # FMHY 架构学习
├── 📊 data/                             # 静态数据目录
│   ├── education.json                   # 教育资源数据
│   ├── developer.json                   # 技术资源数据
│   ├── tools.json                       # 实用工具数据
│   └── entertainment.json               # 娱乐资源数据
├── 📐 schemas/                          # 数据格式规范
│   └── website.json                     # JSON Schema
├── 🎨 static/                           # 静态资源
│   ├── css/                             # 样式文件
│   └── images/                          # 图片资源
└── 🤖 templates/                        # 页面模板
```

## 🧭 四大资源分类

### 1. 📚 教育学习 🎓
**核心资源:**
- 中国大学MOOC、Coursera 开放课程
- 谷歌学术、知网、知网百科
- 在线词典 (有道、百度翻译、DeepL)
- 英语学习 (流利说、每日英语听力)

### 2. 💻 开发技术 💻
**核心资源:**
- GitHub、Gitee、GitLab 开源项目
- Stack Overflow、掘金技术问答
- MDN Web Docs、菜鸟教程
- API 文档聚合 (API List、RunKit)

### 3. ☕ 生活实用 ☕
**核心资源:**
- Unsplash、Pexels 免费图片
- 站酷设计社区、Figma 插件
- 云服务器监控工具
- Base64/URL 编解码工具

### 4. ⚽ 资讯娱乐 ⚽
**核心资源:**
- Bilibili、YouTube 视频平台
- 澎湃新闻、36氪、InfoQ
- 知乎、微博、Twitter
- 网易云音乐、播客平台

## 🚀 快速开始

### 环境准备
```bash
# 安装 Hugo (macOS)
brew install hugo

# 验证安装
hugo version

# 创建项目
cd navigation-website
hugo new site .

# 添加主题
git init
git submodule add https://github.com/thegeeklab/hugo-ana... theme/ananke
```

### 本地开发
```bash
# 启动开发服务器
hugo server -D

# 访问: http://localhost:1313
```

### 部署上线

#### Vercel (推荐 👍)
```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录
vercel login

# 部署
vercel

# 自定义域名 (可选)
vercel domain add yourdomain.com
```

#### GitHub Pages
```bash
# 添加远程仓库
git add .
git commit -m "Initial commit"
git push -u origin main

# GitHub 设置: Settings > Pages > Deploy from branch
```

## 📊 数据格式规范

每个资源使用 JSON 格式：

```json
{
  "name": "中国大学MOOC",
  "url": "https://www.icourse163.org",
  "description": "中国高校在线课程平台，提供国内外名校课程",
  "category": "education",
  "tags": ["在线课程", "免费", "大学"],
  "rating": 5,
  "language": "中文",
  "verified": true,
  "launch_date": "2014年10月"
}
```

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|-----|------|------|------|
| name | string | ✅ | 网站名称 |
| url | string | ✅ | 完整 URL |
| description | string | ✅ | 详细描述 |
| category | string | ✅ | 分类 (education/developer/tools/entertainment) |
| tags | array | ❌ | 标签列表 |
| rating | integer | ❌ | 评分 1-5 |
| language | string | ❌ | 中文/英文 |
| verified | boolean | ❌ | 已验证 |
| launch_date | string | ❌ | 启动日期 |

## 📈 计划梳理

### v1.0 - 基础框架 (目标: 2 周)
- ✅ 项目结构搭建
- ✅ 四大分类基础页面
- ⏳ 数据录入 (每个分类 10-15 个资源)
- ⏳ 基础样式和响应式设计
- ⏳ 首页部署上线

### v1.5 - 功能完善 (目标: 3 周)
- ⏳ 搜索和筛选功能
- ⏳ 站点详情页
- ⏳ 内容验证
- ⏳ SEO 优化
- ⏳ 移动端优化

### v2.0 - 优化增强 (目标: 3 周)
- ⏳ 深色模式实现
- ⏳ 分类图标和美化
- ⏳ 性能优化
- ⏳ 社区功能 (评论、收藏)
- ⏳ RSS Feed 订阅

### v3.0 - 生态建设 (目标: 持续)
- ⏳ GitHub 仓库集成
- ⏳ 多语言支持
- ⏳ 数据分析后台
- ⏳ 开发者 API
- ⏳ 浏览器插件

## 🎨 架构设计亮点

### 继承 FMHY 的优秀设计
> 从 FMHY site 中学习到：

1. **多维度分类** - 详细的一级+二级分类
2. **实时验证** - 链接有效性检测
3. **搜索工具生态** - 多种访问方式
4. **社区治理** - 社区贡献机制
5. **用户体验** - 深色模式、响应式设计

### 创新性设计
1. **合法导向** - 专注免费开源资源
2. **中文优化** - 拒绝繁杂翻译，直达核心
3. **数据验证** - 官方平台为主，降低失效风险
4. **迭代简单** - GitHub Easy Fork 更新

## 🌍 合法资源来源参考

### 官方开放平台
- 清华大学、北京大学公开课
- 国家中小学智慧教育平台
- 中国图书馆免费电子资源
- 微软开源项目计划

### 开源社区
- GitHub Trending
- Linux Foundation 开源项目
- GNOME/KDE 应用商店

### 免费服务
- Google 开放 API
- AWS Free Tier
- Microsoft 面向学生优惠

## 🤝 贡献指南

欢迎贡献！

1. Fork 本仓库
2. 新建特性分支: `git checkout -b feature/AmazingFeature`
3. 提交更改: `git commit -m 'Add some AmazingFeature'`
4. 推送分支: `git push origin feature/AmazingFeature`
5. 提交 Pull Request

## 📦 维护更新

### 资源更新频率
- **官方平台** (中国大学MOOC、B站等): 持续更新
- **第三方工具** (书店、论坛类): 月度更新
- **API 服务**: 季度更新

### 缺失资源补充
- 每月审核上月新增资源
- 用户反馈的重要资源
- 行业趋势推荐

## 🎯 成功标准

✅ **可用性**
- 所有推荐资源可访问
- 搜索响应 < 2秒
- Page Speed > 80

✅ **覆盖度**
- 教育学习: > 30 个可用资源
- 开发技术: > 50 个可用资源
- 生活实用: > 40 个可用资源
- 资讯娱乐: > 50 个可用资源

✅ **质量**
- 所有资源评分 > 3 星
- 60% 以上资源推荐评分 > 4 星
- 每季度验证链接有效性

## 📄 许可证

MIT License - 可自由使用、修改和分发

## 🙏 致谢

- 感谢 FMHY 项目的架构设计启发
- 致敬所有开源和免费平台
- 感谢社区贡献者和用户支持

## 📮 联系方式

- GitHub Issues: 报告问题
- GitHub PRs: 贡献代码
- 邮件: 你的邮箱地址

---

**开始: 阅读 [实施计划.md](./实施计划.md)**
**架构: 参考 [FMHY学习.md](./docs/05-FMHY学习.md)**
**技术: 查看 [README.md](./docs/README.md)**
