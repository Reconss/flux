# FMHY 网站架构学习报告

## 📊 FMHY 资源分类体系

### Wiki 核心分类 (13 个一级分类)

1. **📱 Artificial Intelligence** - 人工智能
2. **📺 Movies / TV / Anime** - 电影、电视剧、动漫
3. **🎵 Music / Podcasts / Radio** - 音乐、播客、广播
4. **🎮 Gaming / Emulation** - 游戏、模拟器
5. **📚 Books / Comics / Manga** - 书籍、漫画、日漫
6. **📥 Downloading** - 下载工具
7. **⚡ Torrenting** - 种子/P2P
8. **🎓 Educational** - 教育资源
9. **🤖 Android / iOS** - 移动应用
10. **🐧 Linux / macOS** - 操作系统
11. **🌍 Non-English** - 非英语资源
12. **🗂️ Miscellaneous** - 杂项
13. **🛡️ System Tools** - 系统工具 (Tools 下)

### Tools 细分分类 (11 种工具)

- **System Tools** - 系统工具
- **File Tools** - 文件工具
- **Internet Tools** - 互联网工具
- **Social Media Tools** - 社交媒体工具
- **Text Tools** - 文本工具
- **Gaming Tools** - 游戏工具
- **Image Tools** - 图片工具
- **Video Tools** - 视频工具
- **Audio Tools** - 音频工具
- **Educational Tools** - 教育工具
- **Developer Tools** - 开发者工具

## 🚀 FMHY 特色功能

### 搜索工具生态
1. **Streamlit Search** - 独立搜索引擎
2. **FMHY Goggles** - Brave 搜索引擎
3. **Bookmark HTML** - 浏览器书签导出
4. **GitHub Search** - GitHub 仓库搜索
5. **Raw Markdown** - 原始文件导出
6. **Dupe Checker** - 重复链接检查

### 网站特色功能
- ✅ Live Link Status - 实时链接检测
- ✅ Private Mode - 隐私保护模式
- ✅ Proxy Mode - 一键代理模式
- ✅ Search Scroll to Match - 自动跳转匹配结果
- ✅ TOC Active Highlighting - 目录高亮
- ✅ 搜索历史保存 (最近20条)
- ✅ 定期备份机制
- ✅ 自动更新系统

## 💡 合法导航网站的优化方案

### 分类体系重构 (合法化)

```
📚 教育学习
├── 在线课程                                          (中国大学MOOC、Coursera)
├── 学术研究                                          (谷歌学术、知网、知乎)
├── 平台认证                                          (证书查询、考试中心)
└── 外语学习                                          (有道、百词斩)

💻 开发技术
├── 开源项目                                          (GitHub、Gitee、GitLab)
├── 在线学习                                          (极客时间、慕课网)
├── API 文档                                          (API 对比、API List)
├── 开发工具                                          (代码托管、API mock)
├── 文档资源                                          (MDN、菜鸟教程)
├── CI/CD                                            (GitHub Actions、GitLab CI)
└── 代码规范                                          (ESLint、Prettier)

☕ 生活实用
├── 设计素材                                          (Unsplash、Pexels、 ICONFCN)
├── 职场工具                                          (项目管理、文档协作)
├── 数据工具                                          (数据分析、可视化)
├── 安全工具                                          (密码管理、加密、脱敏)
├── 破译工具                                          (Base64、URL 编码)
├── 监控工具                                          (服务器、Ping、端口)
├── 本地化                                          (翻译、OCR、语音)
└── 物资共享                                          (社区租赁、二手市场)

⚽ 资讯娱乐
├── 视频平台                                          (B站、YouTube、视频教程)
├── 新闻资讯                                          (澎湃新闻、TechCrunch、36氪)
├── 社交媒体                                          (知乎、微博、Twitter)
├── 音频内容                                          (网易云音乐、播客)
├── 漫画阅读                                          (漫画分享、在线阅读)
├── 电子书                                            (中国数字图书馆)
└── 游戏专区                                          (Steam、独立游戏、Humble Bundle)
```

### 搜索功能增强
- ✅ 全站搜索
- ✅ 分类筛选 (四大分类)
- ✅ 标签过滤 (Tagging)
- ✅ 排序方式 (最新、热门、评分)
- ✅ 搜索历史
- ✅ 搜索建议

### UI/UX 优化 (学习 FMHY)
- ✅ 可切换主题 (深色/明亮)
- ✅ 响应式设计 (移动端优化)
- ✅ 目录导航 (左侧 / 顶部)
- ✅ 链接有效性检测
- ✅ 列表页卡片式布局
- ✅ 平滑滚动
- ✅ 键盘快捷键支持

### 社区和生态
- ✅ GitHub 仓库管理
- ✐ PR 模板 (贡献指南)
- ✐ Issues (问题反馈)
- ✐ License (开源协议)
- ✐ 关于页面 (项目介绍)
- ✐ 提示页 (引导用户)

## 📝 数据结构优化

### 结构化数据示例
```json
{
  "name": "网易云音乐",
  "url": "https://music.163.com",
  "description": "中国领先的在线音乐平台",
  "category": "entertainment",
  "tags": ["音乐", "免费", "在线播放"],
  "rating": 5,
  "language": "中文",
  "verified": true,
  "launch_date": "2013年"
}
```

### 数据字段扩展
增加以下字段提升可用性：
- `verified` - 是否验证过可访问性
- `launch_date` - 启动日期
- `last_update` - 最后更新时间
- `frequency` - 更新频率
- `content_quality` - 内容质量评分
- `user_reviews` - 用户评价汇总

## 🎯 实施路线图 upgraded

### Phase 1: 快速原型 (1 周)
- [ ] 创建项目骨架 (Hugo)
- [ ] 实现四大分类页面
- [ ] 数据录入 (每个分类至少 10 个资源)
- [ ] 基础样式 (Bootstrap)
- [ ] 部署到 Vercel

### Phase 2: 功能完善 (2 周)
- [ ] 添加搜索功能
- [ ] 实现响应式设计
- [ ] 深色模式
- [ ] 添加站点详情页
- [ ] 验证链接有效性

### Phase 3: 优化增强 (2 周)
- [ ] 分类美化 (图标、卡片)
- [ ] 添加标签系统
- [ ] 性能优化
- [ ] SEO 配置
- [ ] 更新脚本自动化

### Phase 4: 社区建设
- [ ] GitHub 仓库部署
- [ ] 贡献指南
- [ ] PR 流程建立
- [ ] Issues 模板

## 🔍 与 FMHY 的关键差异

| 特性 | FMHY | 本方案 (合法) |
|-----|------|--------------|
| 内容性质 | 未经授权内容 | 合法开源/免费资源 |
| 分类原则 | 按内容类型 | 按用途类别 |
| 增长方式 | 社区贡献 | 迭代开发 |
| 维护重点 | 链接验证 (大量第三方网站) | 资源评估 (官方平台) |
| 目标用户 | 下载者 | 学习者/开发者 |

## 📈 数据量预估

基于 FMHY 的 10,000+ 资源节点，本合法方案预期：
- **初期 (v1.0)**: ~100 个优质资源/分类
- **中期 (v2.0)**: ~300 个资源/分类
- **长期 (v3.0)**: ~500+ 个平台级资源

聚焦质量而非数量，确保每个推荐都是：
1. ✅ 官方平台或知名项目
2. ✅ 提供免费服务
3. ✅ 有明确的使用协议
4. ✅ 中文用户友好
