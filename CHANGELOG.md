# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.5.3](https://git.ewing.top/yoea/vibe_blog_next/compare/v0.5.2...v0.5.3) (2026-05-02)


### Bug 修复

* 修复 RSS/sitemap/分享链接硬编码 localhost，登录登出缓存刷新 ([074898b](https://git.ewing.top/yoea/vibe_blog_next/commit/074898be1c9d9b148703d0004643a72492bb44a6))

### [0.5.2](https://git.ewing.top/yoea/vibe_blog_next/compare/v0.5.1...v0.5.2) (2026-05-02)

### Bug 修复

- 多项 bug 修复与文档增强 ([4a5a59f](https://git.ewing.top/yoea/vibe_blog_next/commit/4a5a59f7675ef0ee6d8f526392894c54508faf58))

### [0.5.1](https://git.ewing.top/yoea/vibe_blog_next/compare/v0.5.0...v0.5.1) (2026-05-02)

### 文档

- 新增发版流程文档 ([af33b3d](https://git.ewing.top/yoea/vibe_blog_next/commit/af33b3d296f9316ae0d430b129c45fc5c9f32e1f))
- CLAUDE.md 补充 CHANGELOG 格式兼容和 tag 版本注意事项 ([30682e5](https://git.ewing.top/yoea/vibe_blog_next/commit/30682e58d2471b52da19c6f067c2640d053bc40f))

### 其他变更

- 配置 EditorConfig + Prettier 统一代码风格（2空格/LF/单引号） ([eeea8df](https://git.ewing.top/yoea/vibe_blog_next/commit/eeea8df79f4be1929d34cb0b0c1dc5155cf2d863))
- 全项目 Prettier 格式化（2空格/LF/单引号/尾逗号） ([8422932](https://git.ewing.top/yoea/vibe_blog_next/commit/84229321ad42ca7739f4e3bacb131960de896c55))
- 添加 .gitattributes 强制 LF 换行符，防止 Git autocrlf 干扰 ([d810180](https://git.ewing.top/yoea/vibe_blog_next/commit/d81018087719a4474caa4f0a7a0fb745c112fae7))

### 重构

- 重新排列设置页面卡片顺序，账户相关设置项集中放置 ([5561557](https://git.ewing.top/yoea/vibe_blog_next/commit/5561557183a806a25eaf28a73bef993bb1bb2d66))

### Bug 修复

- 登录拦截复用无权访问页面 ([fe7b192](https://git.ewing.top/yoea/vibe_blog_next/commit/fe7b192eb36329a51359aca287e32cf92bf17486))
- 调整网站地图页面路由展示 ([46ac392](https://git.ewing.top/yoea/vibe_blog_next/commit/46ac392e363670f48e4a16b79219f79c4f49f748))
- 改用无权访问页面处理权限拦截 ([bf2e847](https://git.ewing.top/yoea/vibe_blog_next/commit/bf2e847948a2cdd9bb78166ed2c9aba5eef41590))
- 无权限访问时显示提示并返回首页 ([591f652](https://git.ewing.top/yoea/vibe_blog_next/commit/591f652e3f3f2e1b45cc0f56b23de0f2b500d7c7))
- 修复 header 绿点悬停未显示用户名的问题 ([4441976](https://git.ewing.top/yoea/vibe_blog_next/commit/4441976b608f5a3a35afdce98aa735f6fe80c1b1))
- 修复 header 绿点悬停无法显示数据库 display_name 的问题 ([3819a31](https://git.ewing.top/yoea/vibe_blog_next/commit/3819a311297d51c9f95568373a538686e4728c0c))
- 修复生产环境网站地图域名 ([7e85d63](https://git.ewing.top/yoea/vibe_blog_next/commit/7e85d6310b2a31cc81d37be52d6e6a6434e5f264))
- 修复网站地图自动生成逻辑 ([2f933b5](https://git.ewing.top/yoea/vibe_blog_next/commit/2f933b5602dffaf01b5d2963363112e5277358e8))
- 修复无权限跳转提示未触发 ([e9b3ba5](https://git.ewing.top/yoea/vibe_blog_next/commit/e9b3ba5050cf59170979de5caf6d5f2f370c01c7))

## [0.5.0](https://git.ewing.top/yoea/vibe_blog_next/compare/v0.4.3...v0.5.0) (2026-05-01)

Vibe Blog Next 是一个现代化的个人博客系统，基于 Next.js 16 App Router + Supabase 构建，支持 Markdown 写作、多用户注册、文章互动和完整的部署流水线。

### 技术栈

- **前端框架**: Next.js 16 (App Router) + React 19
- **样式方案**: Tailwind CSS v4 + shadcn/ui (base-nova 风格)
- **后端服务**: Supabase (PostgreSQL + RLS 行级安全 + Auth)
- **认证**: Supabase Auth (PKCE 流程), `@supabase/ssr` cookie 会话管理
- **Markdown**: react-markdown + remark-gfm + rehype-highlight + rehype-sanitize
- **部署**: PM2 双进程 (Next.js + Webhook) + 本地构建上传 + 原子替换 + 健康检查 + 自动回滚
- **CI/CD**: GitHub Actions 自动类型检查 + ESLint + 标签推送自动创建 Release

### 核心功能

#### 文章系统

- Markdown 编辑器，支持实时预览、图片上传/裁剪
- 文章发布/草稿状态、置顶排序、Slug 唯一性
- 文章标签系统：AI 自动生成标签摘要，标签浏览与筛选
- 已注销用户的文章可通过管理员归档至独立存档表，支持恢复或永久删除

#### 用户系统

- 注册/登录（邮箱 + 密码，PKCE 安全认证）
- 个人设置：头像上传、昵称、个人网站、GitHub、Bio、主题偏好
- 通知中心：文章互动通知（评论、点赞），点击标记已读
- 账号注销：级联清理用户数据，注销后可选择匿名化保留文章
- 管理员功能：列出用户、删除用户、归档文章管理

#### 互动功能

- 文章点赞：双重追踪（登录用户 + IP），防止重复点赞
- 评论系统：2 层嵌套回复，扁平 DB 存储 + 客户端构建树结构
- 留言板：作者个人页留言，支持点赞
- 文章分享：生成分享链接 + 二维码

#### 公开页面

- 首页文章列表（分页、置顶优先）
- 文章详情页（Markdown 渲染、代码高亮）
- 标签浏览页 + 标签筛选
- 作者列表 + 作者个人页（含留言板）
- 关于页、隐私政策、法律条款
- RSS 订阅、站点地图、robots.txt
- 站点统计 API（文章数、用户数、访问量）

#### 管理与运维

- 维护模式：通过数据库 `site_config` 表动态切换，排除管理员
- AI 配置：在设置页面管理 API Key / Base URL / Model，存储于数据库
- AI 功能：自动生成文章摘要、自动生成标签
- 命令面板 (⌘K)：全局搜索导航
- 站点统计展示（首页 Hero）
- 面包屑导航、NProgress 进度条

#### 部署与 CI/CD

- 本地构建 → tar 打包 → scp 上传 → 远程原子替换 → PM2 重启 → 健康检查
- 健康检查失败自动回滚，确保服务可用
- Webhook 服务：监听 git push 自动同步代码
- PM2 双进程：Next.js (端口 8083) + Webhook (端口 8084)
- GitHub Actions CI：push/PR 触发 ESLint + TypeScript 类型检查
- GitHub Actions Release：推送 tag 自动从 CHANGELOG 提取内容创建 Release
- 双远程推送：Gitee (origin) + GitHub

### [0.4.3](https://git.ewing.top/yoea/vibe_blog_next/compare/v0.4.2...v0.4.3) (2026-05-01)

### [0.4.2](https://git.ewing.top/yoea/vibe_blog_next/compare/v0.4.1...v0.4.2) (2026-05-01)

### 重构

- 移除通知弹窗的眼睛图标，点击通知本身即可查看 ([ff39018](https://git.ewing.top/yoea/vibe_blog_next/commit/ff390180fb75e36e216f577b90c3e066a7505445))

### Bug 修复

- 个人中心隐藏标签新建入口，添加 showCreate prop 控制 ([f3e3f0c](https://git.ewing.top/yoea/vibe_blog_next/commit/f3e3f0c25be687c69d6eec45c1203a10e7fcc5eb))
- 退出登录改为直接清除 cookie，增强设置页按钮 hover 效果 ([5d07d8b](https://git.ewing.top/yoea/vibe_blog_next/commit/5d07d8b9d0d8b3b8d86422f07db328ddb680d565))
- 退出登录改用 scope:local 确保本地 session 立即清除 ([6f49d85](https://git.ewing.top/yoea/vibe_blog_next/commit/6f49d858194113b323ba705f1148711116f4e4e2))
- 修复通知弹窗关闭按钮误触导航和退出登录失败的问题 ([ac713d0](https://git.ewing.top/yoea/vibe_blog_next/commit/ac713d0344b9f1e7823d2f8492e6f824d4ddda1b))
- 优化注销弹窗提示文案和邮箱选择体验 ([4e7d9f6](https://git.ewing.top/yoea/vibe_blog_next/commit/4e7d9f68eadb7f260997c1d60b14aa406317c20f))
- 注销弹窗邮箱文本从 select-all 改为 select-text 支持逐字选择 ([a849bb9](https://git.ewing.top/yoea/vibe_blog_next/commit/a849bb9041e5e7f95b0029b53711923a1ea0a1e7))
- 注销账号按钮 hover 改为 bg-destructive/30 避免红底红字不可读 ([9979a19](https://git.ewing.top/yoea/vibe_blog_next/commit/9979a1984f475f65e0cf9eb1dc70cdf82f85c1ff))
- 注销账号后作者列表未更新，将 revalidatePath 移到 signOut 之前 ([e4d74a0](https://git.ewing.top/yoea/vibe_blog_next/commit/e4d74a0524c81ad19454ba415f72dacdce52b59e))
- DonateButton 点击区域从整行改为仅包裹子元素 ([edf8c68](https://git.ewing.top/yoea/vibe_blog_next/commit/edf8c68ad5739733a86f48f4bc38f4eb0d39d882))

### 新功能

- 个人中心恢复新建标签入口 ([892005c](https://git.ewing.top/yoea/vibe_blog_next/commit/892005c9b5f4483bd709f6f427b0ba4d3d97776c))
- 文章归档系统 ([a6aae34](https://git.ewing.top/yoea/vibe_blog_next/commit/a6aae341f0fdacb177508698a42477f9cd28b838))

### [0.4.1](https://git.ewing.top/yoea/vibe_blog_next/compare/v0.4.0...v0.4.1) (2026-05-01)

### 文档

- 更新部署文档，反映 tar --exclude、保留 tar 包、PM2 重建流程等优化 ([cededb2](https://git.ewing.top/yoea/vibe_blog_next/commit/cededb263f73386ebdcdc9062f848cd34a2fa458))
- CLAUDE.md 新增发版规范，禁止手动打 tag ([93a0a4e](https://git.ewing.top/yoea/vibe_blog_next/commit/93a0a4e8e7578f223dcfa2e887e46d8741d9b255))

### 其他变更

- 部署成功后保留 tar 包，下次打包自动覆盖 ([9c5d9b3](https://git.ewing.top/yoea/vibe_blog_next/commit/9c5d9b3b33e68ba48ca78b0b5d9225187a3cec4e))
- 打包时排除不必要的开发文件，减小部署包体积 ([85d4032](https://git.ewing.top/yoea/vibe_blog_next/commit/85d40329c1d2b3a4041906dc4248de0d9878d6b2))
- 添加 GitHub Actions CI + 调整 ESLint 规则 ([ba83c61](https://git.ewing.top/yoea/vibe_blog_next/commit/ba83c611f5c1e868eb910a375026c9073006a24f))
- logger 添加时间戳打印 ([6dd86dc](https://git.ewing.top/yoea/vibe_blog_next/commit/6dd86dcb135686b0f95e80f71ebe5e6c2e269145))

### 新功能

- 部署时自动重建 webhook 服务，确保脚本变更生效 ([3f833b6](https://git.ewing.top/yoea/vibe_blog_next/commit/3f833b6b637299fc6f3edafbbf7b11e4cc34c4c9))
- 测试服务器 git push 自动构建部署 ([0053f87](https://git.ewing.top/yoea/vibe_blog_next/commit/0053f87290ce7086c502171bfd00902b443eb422))

### Bug 修复

- 2个服务重建时候显示日志 ([b17503e](https://git.ewing.top/yoea/vibe_blog_next/commit/b17503e600944d647149f4b0d0ab3b37a77c3362))
- 8项UI/功能修复 ([bfd2f46](https://git.ewing.top/yoea/vibe_blog_next/commit/bfd2f46517f2c79ae056ac53390acde45c29856d))
- 部署脚本端口配置不生效导致健康检查失败 ([022d61e](https://git.ewing.top/yoea/vibe_blog_next/commit/022d61ede3d72c75b3b3193196bc164181fde9c4))
- 脚本迁移后 \_\_dirname 相对路径未更新 ([686afd0](https://git.ewing.top/yoea/vibe_blog_next/commit/686afd0ffd2220afc177592a8f98dc1c845c0b47))
- 绿点可点击跳转 + 维护页面状态适配 ([c9a70fc](https://git.ewing.top/yoea/vibe_blog_next/commit/c9a70fc73e5e67a0bfc2cfe57e3bf887424bd9aa))
- 设置页面hydration错误导致退出登录失效 ([afa2524](https://git.ewing.top/yoea/vibe_blog_next/commit/afa25246c7e6f3de629cdf8ef10992b772701f2e))
- 添加登出超时容错，避免 signOut 挂起导致页面无响应 ([8c2c062](https://git.ewing.top/yoea/vibe_blog_next/commit/8c2c062cc1c03965f822ce6e46b4abf72cfa5658))
- 统一 NEXT_PUBLIC_SITE_URL 回退值，从 PORT 环境变量读取端口 ([443af9b](https://git.ewing.top/yoea/vibe_blog_next/commit/443af9b39ac0214acaf373de8b9741df8763527f))
- 退出登录函数添加try/catch和router.refresh ([ed40386](https://git.ewing.top/yoea/vibe_blog_next/commit/ed4038607eb856af255c9ed23ac5dd21f4d3d5a7))
- 修复设置页退出登录按钮无法完成登出和跳转问题 ([5941312](https://git.ewing.top/yoea/vibe_blog_next/commit/5941312ce9f256a97a02704974e5bc46c60c11f9))
- 置顶排序 + 登录状态同步 + 网站地图自动化 ([f27982d](https://git.ewing.top/yoea/vibe_blog_next/commit/f27982dadddb539871920b474a6c0f71e27b9313))
- ecosystem config 读取 .env.local 中的 PORT ([c53a649](https://git.ewing.top/yoea/vibe_blog_next/commit/c53a6494fb80d5567dbdf729e720a9d2bf122de9))
- Header登录状态检测修复 ([d88715a](https://git.ewing.top/yoea/vibe_blog_next/commit/d88715a4fad2608d4ce3d09dfec157d5750236c2))
- Header绿点悬浮显示当前用户名 ([02818c1](https://git.ewing.top/yoea/vibe_blog_next/commit/02818c15f0a982876f325d04e6fc4749b08e4a43))
- new-blog-deploy.sh .env.local 已存在时 SITE_URL 未定义 ([ada97b6](https://git.ewing.top/yoea/vibe_blog_next/commit/ada97b629e4df57af90e251d6ccc78ffe52380ae))

### 重构

- 健康检查从配置文件读取站点地址，移除硬编码域名 ([a05d5f8](https://git.ewing.top/yoea/vibe_blog_next/commit/a05d5f87b5b02f0c973407a97a8cf42bfad88d7d))
- 统一部署配置，移除硬编码路径和 NODE_ENV ([98de808](https://git.ewing.top/yoea/vibe_blog_next/commit/98de80801569ea9768fbb60b4407966779e55b00))
- 主应用部署改为 delete + start 重建流程，与 webhook 保持一致 ([be791d7](https://git.ewing.top/yoea/vibe_blog_next/commit/be791d7461908c92b384d1224281b7a2fa9eeda2))
- scripts 目录按用途分子目录 ([7b41bd7](https://git.ewing.top/yoea/vibe_blog_next/commit/7b41bd7bb65247e9f57bbfd4c3904754b04883d9))
- settings-form 使用统一 logger 替换 console 输出 ([f4ea1e1](https://git.ewing.top/yoea/vibe_blog_next/commit/f4ea1e1a9f680f5a363f84fc4aa7e240375cb396))

### [0.2.6](https://git.ewing.top/yoea/vibe_blog_next/compare/v0.2.5...v0.2.6) (2026-04-29)

### Bug 修复

- 登录弹窗重复触发与设置页排序优化 ([e1c6941](https://git.ewing.top/yoea/vibe_blog_next/commit/e1c6941f726ec28ccf247ab4b271d3a426118fca))
- GitHub绑定错误检测支持query参数 ([09a50cb](https://git.ewing.top/yoea/vibe_blog_next/commit/09a50cb826134f898a6199b06ef7b220c2db82e5))
- webhook git pull改用fetch+reset避免分支分歧 ([6f68c40](https://git.ewing.top/yoea/vibe_blog_next/commit/6f68c40639b9ab1279ea10e6f605ce7e361b34a4))

### 新功能

- 作者列表显示GitHub图标链接 ([76f2dd2](https://git.ewing.top/yoea/vibe_blog_next/commit/76f2dd23ea6605cc490424ba0680ca679a152f03))
- AI标签生成、摘要配置迁移数据库、标签管理优化 ([7f46ce3](https://git.ewing.top/yoea/vibe_blog_next/commit/7f46ce303dd83c646ff6db190a36d8199678ac5f))

### [0.2.5](https://git.ewing.top/yoea/vibe_blog_next/compare/v0.2.4...v0.2.5) (2026-04-29)

### 其他变更

- **release:** 0.2.4 ([ab05d30](https://git.ewing.top/yoea/vibe_blog_next/commit/ab05d30e99faa60f547e7a6014be8d9039dec43f))

### 文档

- 添加远程仓库链接 ([aae9289](https://git.ewing.top/yoea/vibe_blog_next/commit/aae9289d9800085f77d6365526aa95f801aad75f))

### 重构

- 管理员身份改用数据库user_settings.is_admin判断 ([1974ba0](https://git.ewing.top/yoea/vibe_blog_next/commit/1974ba0bbde0424cfbf4bf339fd76e3772778ab4))
- site_config表改为key-value配置模式 ([2a165c8](https://git.ewing.top/yoea/vibe_blog_next/commit/2a165c83ab6ca7b8bd235a3fb6793454792d3852))

### Bug 修复

- 部署计时从构建开始算起，中途进入也能看到已耗时 ([b4c27d1](https://git.ewing.top/yoea/vibe_blog_next/commit/b4c27d109c321bb07a56862fef52d27194dc9673))
- 部署检测间隔改为2秒，检测到完成时停止计时 ([565583b](https://git.ewing.top/yoea/vibe_blog_next/commit/565583be1f96fd5e6f65bb554728030070f7fbf0))
- 解析OAuth回调hash错误并弹出提示 ([4b430da](https://git.ewing.top/yoea/vibe_blog_next/commit/4b430da49e6e5c3ce36c8417f5014479023d754d))
- 修复 ecosystem.config.js 语法错误 ([e4eafff](https://git.ewing.top/yoea/vibe_blog_next/commit/e4eafffee561e25ab6ace83da276c203dc637866))
- 修复 webhook-server.js 缺少 http 模块导入 ([d97e131](https://git.ewing.top/yoea/vibe_blog_next/commit/d97e131c1980c5d6ce1c2dcf1466d970653c18a3))
- 移除个人中心重置密码入口，仅保留设置页 ([89e5967](https://git.ewing.top/yoea/vibe_blog_next/commit/89e59673f0aa6b778cbadb7595a9a9246135f024))
- 移除设置页GitHub绑定，个人中心改为小号绑定入口 ([d6006a0](https://git.ewing.top/yoea/vibe_blog_next/commit/d6006a07c148fcc67b25bf68d864b8f4e0974a39))
- 允许加载 GitHub 头像图片 ([d332e39](https://git.ewing.top/yoea/vibe_blog_next/commit/d332e390737115a546721597fd2148579f6ea177))
- 重置密码页面解码JWT验证recovery身份 ([03acd59](https://git.ewing.top/yoea/vibe_blog_next/commit/03acd5913937d37ce3e2b9d79fcf64e579526b71))
- 重做密码重置流程，用cookie标记替代JWT AMR检测 ([ac52bf1](https://git.ewing.top/yoea/vibe_blog_next/commit/ac52bf115b7ee6eee3c3ad75d4031db8261447ee))
- GitHub OAuth 登录成功后显示提示 ([fd8efef](https://git.ewing.top/yoea/vibe_blog_next/commit/fd8efefc8a02da6a9a95854305e0d967b73591e1))
- GitHub绑定已占用账号时检测用户切换并提示错误 ([a76dfec](https://git.ewing.top/yoea/vibe_blog_next/commit/a76dfec9313e99feaf44ba85f5a782d4070fdcaa))
- site_config写入改用RLS策略，不依赖service role ([f4a48bd](https://git.ewing.top/yoea/vibe_blog_next/commit/f4a48bd10caf186c5d9f41fa31aeabe55a62d6ed))
- webhook 日志时间改为本地时间 (UTC+8) ([d4a0507](https://git.ewing.top/yoea/vibe_blog_next/commit/d4a0507ab73d1da5ea3fed6aa1b1dc1367bee043))
- webhook PM2日志使用本地时间格式(UTC+8) ([a2a4c6a](https://git.ewing.top/yoea/vibe_blog_next/commit/a2a4c6ad21ed7018ef68dc1ea5296efc26c00c39))

### 新功能

- 部署成功弹窗显示版本号及GitHub链接 ([f2e1daf](https://git.ewing.top/yoea/vibe_blog_next/commit/f2e1daf98fe9851af82abe39bc90e2554f9e12c6))
- 部署页面渐变背景与计时器，完成后弹出版本通知 ([440068f](https://git.ewing.top/yoea/vibe_blog_next/commit/440068fcbce29943abada6a854e3847e7bcb1ae3))
- 修改密码与GitHub绑定交互重构 ([6c4a65f](https://git.ewing.top/yoea/vibe_blog_next/commit/6c4a65fa5eab4b360057dbf98c4c15db9a264c5a))
- toast 通知添加关闭按钮 ([0eb3c2e](https://git.ewing.top/yoea/vibe_blog_next/commit/0eb3c2e5efeb72c60f7b3ff11f8f09c567b7925e))

### [0.2.4](https://git.ewing.top/yoea/vibe_blog_next/compare/v0.2.2...v0.2.4) (2026-04-29)

### Bug 修复

- 部署脚本 npm ci 前自动清理 node_modules ([ef74e42](https://git.ewing.top/yoea/vibe_blog_next/commit/ef74e42f5c92224ac2af40e1e59f0e685c926c8c))

### 文档

- 添加部署架构说明到 CLAUDE.md ([bd5ca9d](https://git.ewing.top/yoea/vibe_blog_next/commit/bd5ca9d60e2be11967ec3b9bbdc0dd0cce81e3c8))

### 其他变更

- 添加脚本顶部注释，忽略 .claude/ 目录 ([4d6c703](https://git.ewing.top/yoea/vibe_blog_next/commit/4d6c703abcddef6f9ca759fb02f28b1b1ee1de75))

### 新功能

- 集成 GitHub OAuth 登录功能 ([de4f59b](https://git.ewing.top/yoea/vibe_blog_next/commit/de4f59bd4b33999fe30062e994a44424ac200df5))

### [0.2.3](https://git.ewing.top/yoea/vibe_blog_next/compare/v0.2.2...v0.2.3) (2026-04-29)

### Bug 修复

- 部署脚本 npm ci 前自动清理 node_modules ([ef74e42](https://git.ewing.top/yoea/vibe_blog_next/commit/ef74e42f5c92224ac2af40e1e59f0e685c926c8c))

### 文档

- 添加部署架构说明到 CLAUDE.md ([bd5ca9d](https://git.ewing.top/yoea/vibe_blog_next/commit/bd5ca9d60e2be11967ec3b9bbdc0dd0cce81e3c8))

### 其他变更

- 添加脚本顶部注释，忽略 .claude/ 目录 ([4d6c703](https://git.ewing.top/yoea/vibe_blog_next/commit/4d6c703abcddef6f9ca759fb02f28b1b1ee1de75))

### 新功能

- 集成 GitHub OAuth 登录功能 ([de4f59b](https://git.ewing.top/yoea/vibe_blog_next/commit/de4f59bd4b33999fe30062e994a44424ac200df5))

### [0.2.2](https://git.ewing.top/yoea/vibe_blog_next/compare/v0.2.1...v0.2.2) (2026-04-28)

### 新功能

- 关于页版本号添加 GitHub 跳转链接 ([5f2dcda](https://git.ewing.top/yoea/vibe_blog_next/commit/5f2dcda30b8648d3877c43e4b29f20ef4462f5a7))

### [0.2.1](https://git.ewing.top/yoea/vibe_blog_next/compare/v0.2.0...v0.2.1) (2026-04-28)

### Bug 修复

- 维护页进程wait退出码导致deploy.sh崩溃 ([fbb94e2](https://git.ewing.top/yoea/vibe_blog_next/commit/fbb94e2df0c752d9f49656c318099d31cd172a91))
- 重写维护页匹配主站风格 ([6130cc3](https://git.ewing.top/yoea/vibe_blog_next/commit/6130cc32a5fa9b9ad3b7665360dc6eeb6af16c81))
- 遵循 Next.js 16 proxy 命名约定 ([ce58cdb](https://git.ewing.top/yoea/vibe_blog_next/commit/ce58cdb0c84237319630c22d3edca38b4d660725))

### 新功能

- 设置页添加维护模式开关（管理员可见） ([993bced](https://git.ewing.top/yoea/vibe_blog_next/commit/993bced389d17c0bffebc996f80451646125d6ad))
- 手动维护模式 + site_config 全局配置表 ([6b65f8a](https://git.ewing.top/yoea/vibe_blog_next/commit/6b65f8af5b414078d67ab6d7982b13fe04184641))
- 维护模式白名单与导航栏隐藏 ([bbf40cd](https://git.ewing.top/yoea/vibe_blog_next/commit/bbf40cda3c7bbd994251d9bda83a5186bd408b4c))

## [0.2.0](https://git.ewing.top/yoea/vibe_blog_next/compare/v0.1.12...v0.2.0) (2026-04-26)

字里行间 v0.2.0 — 基于 Next.js 16 + Supabase 的个人博客系统。

### 功能特性

- **Markdown 写作**，支持代码高亮、表格、任务列表
- **文章标签分类**，快速定位感兴趣的内容
- **评论与回复**，支持多级嵌套
- **留言板**，与作者和读者直接交流
- **深色/浅色主题**自由切换
- **RSS 订阅**，不错过任何更新
- **响应式设计**，桌面和移动端皆可流畅浏览

### 技术栈

Next.js 16 · Supabase · Tailwind CSS v4 · shadcn/ui · PM2 · Nginx

### 性能优化

- 跳过不必要的npm ci重装 ([ef7a0fc](https://git.ewing.top/yoea/vibe_blog_next/commit/ef7a0fca7e090c17b24832f05cda46c7d4c7e9d4))

### Bug 修复

- 分支推送webhook改为git pull拉取代码 ([552fa86](https://git.ewing.top/yoea/vibe_blog_next/commit/552fa86ff317f2f82ae879e45bd6ec15f93b2cb7))
- webhook日志增强，部署后自动重启webhook进程 ([425fd2a](https://git.ewing.top/yoea/vibe_blog_next/commit/425fd2ace7c7940a6982cc1ca7abf7f252c1fcfd))
- webhook注册改用delete+start防止路径残留 ([9309ac5](https://git.ewing.top/yoea/vibe_blog_next/commit/9309ac56bd94eb2ab818065344037ea07499e44c))
- webhook自重启移出deploy.sh避免自残进程 ([a34286c](https://git.ewing.top/yoea/vibe_blog_next/commit/a34286cb62370bd0b6e932f42048d61587ff99fb))

### [0.1.12](https://git.ewing.top/yoea/vibe_blog_next/compare/v0.1.11...v0.1.12) (2026-04-28)

### 其他变更

- 发版脚本改为附注标签，含完整 CHANGELOG 描述 ([2f04241](https://git.ewing.top/yoea/vibe_blog_next/commit/2f042415b22d5260c1f8d5a14738cef722e39ea3))
- 优化webhook分支推送跳过日志文案 ([d806298](https://git.ewing.top/yoea/vibe_blog_next/commit/d806298eb0bb1c11b1393a96eaa0e6906701e186))

### 新功能

- 运维文件归入scripts目录，新增维护页 ([7bf8cde](https://git.ewing.top/yoea/vibe_blog_next/commit/7bf8cde1e4b1e636786bc9403cedcd2c43aea3ee))

### Bug 修复

- 修复 deploy.sh 可执行权限 ([acd227f](https://git.ewing.top/yoea/vibe_blog_next/commit/acd227f96deeacf8fa1ec2ff5b9c792d9978691a))
- 修复面包屑移动端竖向排列问题 ([7e28028](https://git.ewing.top/yoea/vibe_blog_next/commit/7e280287f76a52f31bf4fc760bb0be69fc244ca8))
- 移动端面包屑防换行与截断优化 ([6e473c1](https://git.ewing.top/yoea/vibe_blog_next/commit/6e473c127506f482be78c2cb657b40a851f7b5be))

### [0.1.11](https://git.ewing.top/yoea/vibe_blog_next/compare/v0.1.10...v0.1.11) (2026-04-28)

### 文档

- 更新 README，补充 PM2 管理说明与修复路径错误 ([409d99d](https://git.ewing.top/yoea/vibe_blog_next/commit/409d99d6f8982dc2d9152ed75ba0c1b03465563c))

### Bug 修复

- 部署时仅重启 Next.js，避免重启 webhook 自身 ([7ed7ea0](https://git.ewing.top/yoea/vibe_blog_next/commit/7ed7ea0bbfea7c40274e6aa310471ed13cada54c))
- 适配作者列表页移动端排版 ([8b60c30](https://git.ewing.top/yoea/vibe_blog_next/commit/8b60c3008fc5061783d79c3d3c7dd73b3b01526d))

### [0.1.10](https://git.ewing.top/yoea/vibe_blog_next/compare/v0.1.9...v0.1.10) (2026-04-28)

### 重构

- 抽取公用工具函数与 linkRef 常量 ([72a72aa](https://git.ewing.top/yoea/vibe_blog_next/commit/72a72aa0fda60918a426e582b00a2ce3ffb1ee8d))

### [0.1.9](https://git.ewing.top/yoea/vibe_blog_next/compare/v0.1.8...v0.1.9) (2026-04-28)

### Bug 修复

- 更新关于页面技术栈与提交次数格式 ([53c8f9e](https://git.ewing.top/yoea/vibe_blog_next/commit/53c8f9e876680d432c34c983614ac78cd06ba1a6))

### 新功能

- 优化个人中心头像与布局 ([273d315](https://git.ewing.top/yoea/vibe_blog_next/commit/273d315077636896e524f2ea51124d59b18270db))

### 重构

- webhook 部署触发改为仅标签推送 ([95a633f](https://git.ewing.top/yoea/vibe_blog_next/commit/95a633f964c91a689f4e8198adce4fda1b6c79c8))

### [0.1.8](https://git.ewing.top/yoea/vibe_blog_next/compare/v0.1.7...v0.1.8) (2026-04-28)

### Bug 修复

- webhook 返回详细信息 ([67611a4](https://git.ewing.top/yoea/vibe_blog_next/commit/67611a41b78ee91f1a70aef4c9d775df1e5ca78d))

### [0.1.7](https://github.com/yoea/vibe-blog-nextjs/compare/v0.1.6...v0.1.7) (2026-04-28)

### Bug 修复

- 面包屑与UX功能优化 ([d593d3c](https://github.com/yoea/vibe-blog-nextjs/commit/d593d3c487a36e862e7d74aad56793d8e54a0099))

### [0.1.6](https://github.com/yoea/vibe-blog-nextjs/compare/v0.1.5...v0.1.6) (2026-04-28)

### Bug 修复

- 点赞失败时显示真实错误信息 ([87edcf9](https://github.com/yoea/vibe-blog-nextjs/commit/87edcf96e6b3d35049e98224522f1d15f6c7e713))

### [0.1.5](https://github.com/yoea/vibe-blog-nextjs/compare/v0.1.4...v0.1.5) (2026-04-28)

### Bug 修复

- 自动启动webhook与配置开机自启 ([3822b4e](https://github.com/yoea/vibe-blog-nextjs/commit/3822b4ea505c474e8248e7213c58dc6f9be4d499))

### [0.1.4](https://github.com/yoea/vibe-blog-nextjs/compare/v0.1.3...v0.1.4) (2026-04-28)

### Bug 修复

- 自动配置 PM2 开机自启 ([15bbcbb](https://github.com/yoea/vibe-blog-nextjs/commit/15bbcbb714a87e2030b4164cd708d15d1b2327c3))

### [0.1.3](https://github.com/yoea/vibe-blog-nextjs/compare/v0.1.2...v0.1.3) (2026-04-28)

### 其他变更

- 优化部署流程与 webhook 密钥管理 ([3a95202](https://github.com/yoea/vibe-blog-nextjs/commit/3a9520264e658e846c807001ff26db0b2c2f6fb0))

### Bug 修复

- 更新关于页面与站点地图 ([fe8a02d](https://github.com/yoea/vibe-blog-nextjs/commit/fe8a02d7dda940aa9f7a506456877b5300bacbf3))
- standalone 配置仅在生产构建时启用 ([aab6005](https://github.com/yoea/vibe-blog-nextjs/commit/aab6005847b2dc21e42a753cdc46cba17376b231))

### [0.1.2](https://github.com/yoea/vibe-blog-nextjs/compare/v0.1.1...v0.1.2) (2026-04-28)

### 新功能

- 评论/留言系统重构 - 统一1级嵌套 ([40415b6](https://github.com/yoea/vibe-blog-nextjs/commit/40415b6d18f225bbfa7afa6bbff82a3ae8780d5d))

### Bug 修复

- 回复折叠优化，仅折叠超出1条的回复 ([7544259](https://github.com/yoea/vibe-blog-nextjs/commit/75442595de6750c93d6c255aa3d6436f0129a12c))
- 移动端首页点赞超时 - 放宽 timestamp 校验窗口至60秒 ([aa0aacf](https://github.com/yoea/vibe-blog-nextjs/commit/aa0aacf34236b93442a3794e70f449fb2a09ec2b))

### [0.1.1](https://github.com/yoea/vibe-blog-nextjs/compare/v0.0.1...v0.1.1) (2026-04-28)

### 重构

- 多作者架构改进 — 去除 service_role 依赖、统一权限 ([9cc6ee7](https://github.com/yoea/vibe-blog-nextjs/commit/9cc6ee75425daf387fd0810cb76be149c7934a02))
- 简化部署流程，每次强制清理并重建；schema.sql 增加 ip 列兼容迁移 ([6889878](https://github.com/yoea/vibe-blog-nextjs/commit/6889878a596c35849112dcd90d4f68c832775ebb))
- 提取 AuthorCard 组件，作者页和我的文章页风格统一 ([e10ca0b](https://github.com/yoea/vibe-blog-nextjs/commit/e10ca0be2ad60876be75f076e785cd41b53e326c))
- 提取 DonateButton 自包含组件，统一设置页和网站地图的捐赠入口 ([b7763e8](https://github.com/yoea/vibe-blog-nextjs/commit/b7763e8acc6172868456bddae7772b15da6a10e5))
- 添加 PM2 ecosystem 配置文件管理端口和进程 ([42bcad2](https://github.com/yoea/vibe-blog-nextjs/commit/42bcad257329714093e48b52be6144468b08f8a0))
- 统一 PostCard 组件、文章状态文案更新、标题截断修复 ([9612213](https://github.com/yoea/vibe-blog-nextjs/commit/961221386ff9b9b7ff2fe952b146561c0382e215))
- 文章状态改为"公开发布"/"私密"，编辑页添加状态说明 ([b4b55f0](https://github.com/yoea/vibe-blog-nextjs/commit/b4b55f0964bf04332b6df5464e652ca1a6357f74))
- deploy.sh 改为始终重建 PM2 服务，增加静态资源健康检查 ([720d4b1](https://github.com/yoea/vibe-blog-nextjs/commit/720d4b1fbec44dee2da95f006089df7cf393dfe2))
- my-posts 路由改为 /profile，个人信息卡片重新排版 ([c820515](https://github.com/yoea/vibe-blog-nextjs/commit/c8205153833a0db19b870718d2d55e3a7011e8da))

### 文档

- 更新 README，补充自动部署、留言板等功能说明 ([9b31d6d](https://github.com/yoea/vibe-blog-nextjs/commit/9b31d6d02cab5a34a1cd78d9a8567377eeed2873))
- 恢复 TODO 列表完整项 ([a7f2eb9](https://github.com/yoea/vibe-blog-nextjs/commit/a7f2eb9cfde2274afbbdd718a6c19b7c183c11c8))
- CLAUDE.md 改为中文内容 ([725666d](https://github.com/yoea/vibe-blog-nextjs/commit/725666d508399fbb2b2dbc75856fc377b6f75c3d))

### Bug 修复

- 编辑器文本域自动撑满视口剩余高度，全屏编辑增加源码/预览切换 ([96c59af](https://github.com/yoea/vibe-blog-nextjs/commit/96c59af8f620e37e4dd2399ab58d6c736bac02f0))
- 编辑头像按钮移入头像下方，昵称无变化不调数据库，ESC退出编辑 ([4a63ddb](https://github.com/yoea/vibe-blog-nextjs/commit/4a63ddbba8fd035da2e27697a8895d30d2372ae8))
- 标签管理新建标签添加随机颜色 ([556bc1e](https://github.com/yoea/vibe-blog-nextjs/commit/556bc1e4320ff8bee9d8c8ea81c943096fefb0d0))
- 代码块复制在非HTTPS环境下的兼容性 ([77a08d1](https://github.com/yoea/vibe-blog-nextjs/commit/77a08d11aa4a361fa4768c24fac4700c90ac8564))
- 多项修复 — hydration 警告、命名规范、无障碍、死代码清理 ([39759ac](https://github.com/yoea/vibe-blog-nextjs/commit/39759ac9a750527a1e449b4b52b9a144c60e16fe))
- 更新 schema.sql 匿名点赞 RLS 策略及修复相关 bug ([48ef1b2](https://github.com/yoea/vibe-blog-nextjs/commit/48ef1b27c8dd4ee69e42de17fbabfc5f327b51a2))
- 管理员可删除任意标签，标签可点击跳转 ([ce9dd92](https://github.com/yoea/vibe-blog-nextjs/commit/ce9dd926c2018aa114587afe84986a159e9c265b))
- 加载更多时去重、点赞按钮移至回复前并显示"点赞"文字 ([a12b5fe](https://github.com/yoea/vibe-blog-nextjs/commit/a12b5fe064a97038f083b38febd0e68504e78784))
- 进度条点击同路由链接时不再卡住 ([59c5fa8](https://github.com/yoea/vibe-blog-nextjs/commit/59c5fa84d6a747584485a6cdb66a82d9080e4730))
- 留言板接收者无法删除留言 ([f0c361a](https://github.com/yoea/vibe-blog-nextjs/commit/f0c361a085648fceab5913ca2e10592b6e59146b))
- 评论数量显示使用增量更新，避免被本地已加载数量覆盖 ([f4f4693](https://github.com/yoea/vibe-blog-nextjs/commit/f4f469362b93c65b132721ef143927d6657d408c))
- 切回 Turbopack 构建，添加全局 500 错误页面 ([155e1b4](https://github.com/yoea/vibe-blog-nextjs/commit/155e1b47abc711033ec507b18936d3fdab93abec))
- 删除/新增评论时禁止在 setItems 回调内更新父组件 state ([0486956](https://github.com/yoea/vibe-blog-nextjs/commit/0486956962c1d83fce0a0dd6dc2c938787d44321))
- 删除按钮与卡片内容重叠；删除后用户回到列表的 bug ([44fddc9](https://github.com/yoea/vibe-blog-nextjs/commit/44fddc9dd1e343afd4dd47c3a6e57d2726955669))
- 删除用户未持久化；删除按钮高度不一致 ([e68581c](https://github.com/yoea/vibe-blog-nextjs/commit/e68581cad4cb3e86149a440f0f750e6ec6993b17))
- 使用唯一文件名替代 ?t= 时间戳参数，修复头像缓存与 hydration 警告 ([51b9271](https://github.com/yoea/vibe-blog-nextjs/commit/51b927109f5e6842c680b6c46916cd05c8ae7653))
- 首页文章标题因 CSS Grid 未正确截断省略 ([798056a](https://github.com/yoea/vibe-blog-nextjs/commit/798056ac2dad51cd2f2cc4a6d3c9c1ba68ae4a01))
- 头像预览改用原生 <img> 标签，消除打开卡顿 ([eab85fe](https://github.com/yoea/vibe-blog-nextjs/commit/eab85fec275cb654fd663f8f8f052eb9c7e5f90a))
- 完善点赞 Server Action 错误处理，修复游客点赞不生效 ([c24bc6a](https://github.com/yoea/vibe-blog-nextjs/commit/c24bc6a94f852560ffc4fbd731c80f11f18b4f1d))
- 修复 deploy.sh 中 source 文件变更检测路径 ([6fab387](https://github.com/yoea/vibe-blog-nextjs/commit/6fab387d1b9bd34cb7dc7786e5174511a8b4b8ca))
- 修复 production 部署中 logo.svg 404 和 Turbopack chunk 加载失败的问题 ([e433cd6](https://github.com/yoea/vibe-blog-nextjs/commit/e433cd6fcab56093eb20887e9e1f340c5ca55576))
- 修复 standalone 静态资源复制路径，避免目录嵌套 ([de46249](https://github.com/yoea/vibe-blog-nextjs/commit/de46249f981cb25942906723b247a354cda234ab))
- 修复编辑页面 hydration 不匹配（草稿恢复横幅导致 DOM 结构差异） ([8c798b5](https://github.com/yoea/vibe-blog-nextjs/commit/8c798b59ce866608a10a6e96b14350df2bad9eb4))
- 修复标签保存与详情页间距 ([2d8e508](https://github.com/yoea/vibe-blog-nextjs/commit/2d8e50868d559f0fbe74c4806c515a32c3832d8e))
- 修复多处 Bug 和性能问题 ([f131b2f](https://github.com/yoea/vibe-blog-nextjs/commit/f131b2f8143376ea53bc6b3b35414d9e566a83ab))
- 修复回复嵌套评论时内容不立即显示的问题 ([08ed628](https://github.com/yoea/vibe-blog-nextjs/commit/08ed628f136b543b717d3b4e44b1d738860d7c0e))
- 修复网站地图图标导出错误，分类展示路由页面 ([1816197](https://github.com/yoea/vibe-blog-nextjs/commit/18161974ad6db932fee46f6f461aea0c238c8c6b))
- 修复文章页面 React hydration 错误 [#418](https://github.com/yoea/vibe-blog-nextjs/issues/418) ([65ef0b7](https://github.com/yoea/vibe-blog-nextjs/commit/65ef0b737582a9fcb731d309ab80317498512bfb))
- 移除 webpack 配置改用 --webpack 标志显式指定构建工具 ([759897e](https://github.com/yoea/vibe-blog-nextjs/commit/759897ea8326861c7b5a1ab0ab9cbbcb30543d35))
- 移除客户端路由缓存，修复评论/点赞不刷新 ([49e3b16](https://github.com/yoea/vibe-blog-nextjs/commit/49e3b167b2fe7e2f0544f0696a40ad326b944da2))
- 移动端显示优化 - 编辑工具栏、作者列表、标签间距、版权居中 ([d2327d8](https://github.com/yoea/vibe-blog-nextjs/commit/d2327d8ed1a89e97352c32aca00068e3cd103f68))
- 游客点赞评论无响应 ([96006f7](https://github.com/yoea/vibe-blog-nextjs/commit/96006f7616d7256d5e160692079d7f2c7491eaf0))
- 游客可以回复他人的评论 ([6d88314](https://github.com/yoea/vibe-blog-nextjs/commit/6d883146cb6d4c30b2e558d05307f4862045477d))
- 游客评论昵称参数未传递至 Server Action ([6e240ac](https://github.com/yoea/vibe-blog-nextjs/commit/6e240ac8ff4e3147f56e4a945e163ba9280aaf17))
- 游客评论误显示删除按钮 ([1c00125](https://github.com/yoea/vibe-blog-nextjs/commit/1c00125a8c12652b7b32ccb8601f8a9cd1974aa2))
- 重命名 middleware.ts 为 proxy.ts（Next.js 16 弃用 middleware.ts），删除无用迁移文件 ([e6e6bce](https://github.com/yoea/vibe-blog-nextjs/commit/e6e6bce0f8c9a86cbdd5fa1a38a497e400ad3a8e))
- 重置密码流程优化、设置页按钮重组、注销用户标识改进 ([3871ee6](https://github.com/yoea/vibe-blog-nextjs/commit/3871ee6cf0a9a53e2ae34c75d88ba8a689b6e5b8))
- 重置密码邮件链接跳转修复 ([f1897ef](https://github.com/yoea/vibe-blog-nextjs/commit/f1897ef2f2e6b27684424a616ccce3357978d1c8))
- 注册天数显示去掉"前"字 ([f32705d](https://github.com/yoea/vibe-blog-nextjs/commit/f32705d33fa1ee840d39b7b59ca98d59d35966e8))
- 子评论点赞按钮绑定父级数据的 bug ([d8bde6c](https://github.com/yoea/vibe-blog-nextjs/commit/d8bde6c2ef977de9045034eb0405e10fc56b8e19))
- 作者列表恢复状态显示，已注销用户单独分组 ([b248585](https://github.com/yoea/vibe-blog-nextjs/commit/b2485856fc2cde11179b9627d49335814c791d6a))
- deploy.sh 只重启主应用，不动 webhook 进程；健康检查改用本地端口 ([72c8bc2](https://github.com/yoea/vibe-blog-nextjs/commit/72c8bc23988278c66c44b33854695ca30a1ba7d6))
- markdown 代码块背景使用主题变量，适配深浅色模式 ([57d750b](https://github.com/yoea/vibe-blog-nextjs/commit/57d750b128ca395b9ac792774a503a71deda0dc4))
- proxy.ts 导出函数名从 middleware 改为 proxy（Next.js 16 要求） ([abdb68d](https://github.com/yoea/vibe-blog-nextjs/commit/abdb68d7ebe7c8b4018dca5bf8d0dbf8c9775966))
- RLS 策略、XSS 防护、N+1 查询、类型统一等多项修复 ([962a5f1](https://github.com/yoea/vibe-blog-nextjs/commit/962a5f1f88152ed6dc07d98b9d29a01a118c0b95))
- standalone 部署时手动复制 .next/static 资源目录 ([9ff5dd8](https://github.com/yoea/vibe-blog-nextjs/commit/9ff5dd833f39d76c1547d55e0baf3a8126636b5c))
- webhook 并发保护，新请求自动终止旧部署 ([5088c6c](https://github.com/yoea/vibe-blog-nextjs/commit/5088c6cdc67226e88251ac3c47aa1f66649ec0ed))
- webhook 改为异步部署，先回 202 再后台执行 ([9855d9e](https://github.com/yoea/vibe-blog-nextjs/commit/9855d9e6b60560681e3d528e04ed504d281cf068))
- webhook 监听 0.0.0.0 以接收 Docker 容器请求 ([7d30125](https://github.com/yoea/vibe-blog-nextjs/commit/7d301251f6f18f79d3af2e6e192f379d3aa5af52))

### 新功能

- 标签管理页面与标签系统增强 ([4d279eb](https://github.com/yoea/vibe-blog-nextjs/commit/4d279eb890fcee20d3b12e27f934256fe7be0b2e))
- 超级管理员可通过作者列表直接删除用户 ([d1032fa](https://github.com/yoea/vibe-blog-nextjs/commit/d1032fa9c308918580f1fd4c098d488fb3d7451f))
- 创建隐私政策和法律信息页面 ([2db72e7](https://github.com/yoea/vibe-blog-nextjs/commit/2db72e7c405fb40a00ad433f2a699bc8881a48c2))
- 分享功能重构，sitemap/rss/robots SEO 优化 ([4e83210](https://github.com/yoea/vibe-blog-nextjs/commit/4e832108d7b9d98f9b227108e145a343b45108d5))
- 个人中心加新建文章按钮，文章列表增加置顶操作 ([789b0a8](https://github.com/yoea/vibe-blog-nextjs/commit/789b0a838446a09da1c9380fb3542638c6bbc849))
- 关于页面提取为独立页面 ([35abe08](https://github.com/yoea/vibe-blog-nextjs/commit/35abe0838e282f0a874d382e46ae116f2741c20b))
- 管理员不能删除自己和其他管理员 ([c4bfd7d](https://github.com/yoea/vibe-blog-nextjs/commit/c4bfd7dc42c6bd3e84129fd0839d8d1e765d963c))
- 键盘快捷键适配 - 移动端隐藏提示、不同OS显示对应按键 ([7d44a9d](https://github.com/yoea/vibe-blog-nextjs/commit/7d44a9decb214cd92f32cef0e693d6bc579886c8))
- 列表页头像异步延迟加载，文章列表改为 User 图标 ([7ebdc90](https://github.com/yoea/vibe-blog-nextjs/commit/7ebdc90c39feedd1b3471f8c9ebc2420c24a0acd))
- 面包屑导航 - 文章详情页顶部替换返回按钮 ([94e3905](https://github.com/yoea/vibe-blog-nextjs/commit/94e390540d5c844672ccf9e164906eb0c390b82c))
- 匿名操作频率限制统一改为 10次/小时 ([8aa87a1](https://github.com/yoea/vibe-blog-nextjs/commit/8aa87a1afe5dd903e69caeb5053d0a892af42e42))
- 评论回复 + 评论点赞功能 ([1556335](https://github.com/yoea/vibe-blog-nextjs/commit/15563350f399ffb203d688b95cf3bbc847bb4e52))
- 设置页底部显示构建日期 ([32f2592](https://github.com/yoea/vibe-blog-nextjs/commit/32f259265cae26255d0dec18429afe0ba27942d6))
- 设置页关于卡片显示站点名、构建时间和提交哈希 ([7355010](https://github.com/yoea/vibe-blog-nextjs/commit/73550102178fea701ab59a9b077d9d4056ffbcdb))
- 设置页显示构建信息 ([9e9c477](https://github.com/yoea/vibe-blog-nextjs/commit/9e9c47788a11a107dc290665fc8a540b0c7680f8))
- 实现标签系统 ([5040f04](https://github.com/yoea/vibe-blog-nextjs/commit/5040f04785b3d0d966b077ea5371462d967046f7))
- 首页和我的文章列表改为懒加载 ([0b42da5](https://github.com/yoea/vibe-blog-nextjs/commit/0b42da5a8fdff727bc95fb6ee648021cb58ef8b9))
- 首页未登录时显示游客操作提示 ([5feb2b6](https://github.com/yoea/vibe-blog-nextjs/commit/5feb2b612f1cebfeba5dc6cc56376fb33ed67d16))
- 首页文章列表显示作者名并支持点击跳转，网站地图精简为仅路由页面 ([9eb755f](https://github.com/yoea/vibe-blog-nextjs/commit/9eb755f4f229e4ab5bdba5e02d1d71b694e555ed))
- 提取 SiteHero 组件，增加全站文章统计，同步显示到网站地图 ([f3f6cf1](https://github.com/yoea/vibe-blog-nextjs/commit/f3f6cf1cd79ad9096ecf601c00cbf7edddb794c4))
- 提取LoadMore通用组件、标签页置顶修复、Web Share API支持 ([eb3f477](https://github.com/yoea/vibe-blog-nextjs/commit/eb3f477a1722b442056be2468465654c4b88ca6a))
- 添加 Gitea Webhook 自动部署接收器 ([a43db1e](https://github.com/yoea/vibe-blog-nextjs/commit/a43db1e4916db70b3af6502d82fd2c2bc3933886))
- 添加 Open Graph 元数据，支持微信分享卡片显示标题/摘要/LOGO ([b63178a](https://github.com/yoea/vibe-blog-nextjs/commit/b63178aa4eb721c258b17a5a429fe9954cc903a4))
- 添加默认 OG 分享图 og-image.jpg ([ec5c5fa](https://github.com/yoea/vibe-blog-nextjs/commit/ec5c5fa5ec315f5a22e8e6030fcd9fdd442d9f45))
- 添加用户头像系统，支持上传/裁剪/压缩/全站显示 ([7caeba5](https://github.com/yoea/vibe-blog-nextjs/commit/7caeba541e412a94407bf1ebb86ef8d364333a42))
- 头像支持点击查看大图 ([f623092](https://github.com/yoea/vibe-blog-nextjs/commit/f623092e709960b73658d16e0614d922ca4ed8b6))
- 网站地图页面添加标题并移除 SiteHero 组件 ([2f0a924](https://github.com/yoea/vibe-blog-nextjs/commit/2f0a924a1da2ed93a6f31b38bf242615e2c61bec))
- 文章编辑器自动暂存到 localStorage，支持恢复草稿 ([72799ee](https://github.com/yoea/vibe-blog-nextjs/commit/72799ee5782708bf194cabeefeb317dd2d03c353))
- 文章全文搜索、分享计数、AI摘要改进、自动保存优化 ([a52636e](https://github.com/yoea/vibe-blog-nextjs/commit/a52636e3b0faa2a347f2f623ce25bf6e93d51701))
- 文章详情页标题下方显示摘要 ([de83aa2](https://github.com/yoea/vibe-blog-nextjs/commit/de83aa241f72a82f2f92011300f52ee74d47d83a))
- 文章置顶功能 ([8d34a90](https://github.com/yoea/vibe-blog-nextjs/commit/8d34a9007b659f3ba77d079a46e37e5cfb7ddead))
- 我的文章和设置页面显示管理员标识 ([ee58918](https://github.com/yoea/vibe-blog-nextjs/commit/ee589187c03b8a0c20ba213b4c01c956a275a027))
- 我的文章页标题旁显示文章总数 ([9c10496](https://github.com/yoea/vibe-blog-nextjs/commit/9c10496f7ac100983d96c25584a6525ebdbb5a95))
- 新增命令面板和代码块复制功能 ([66b2382](https://github.com/yoea/vibe-blog-nextjs/commit/66b2382a0b6c233ce79fbd5edfddcf54b96f2130))
- 用户主页留言板、评论懒加载、评论交互组件优化 ([578c76f](https://github.com/yoea/vibe-blog-nextjs/commit/578c76f1ce7411ed8001854565a15ecc67a79092))
- 优化500错误页面，区分维护、部署、超时等场景 ([4db48c5](https://github.com/yoea/vibe-blog-nextjs/commit/4db48c5244b0e49e384cdfe2ba833c26f98fa776))
- 游客可点赞评论（IP 去重） ([3f67fe3](https://github.com/yoea/vibe-blog-nextjs/commit/3f67fe3c1b2efbace36f0ebc7fc7f5251151c1b6))
- 游客昵称存入 localStorage 自动填充 ([6ad3bda](https://github.com/yoea/vibe-blog-nextjs/commit/6ad3bda27949c6cc37022b21c760461b093938ed))
- 游客评论与留言功能 ([15d0c57](https://github.com/yoea/vibe-blog-nextjs/commit/15d0c57966efb011cb8c2a5ab031f66d373585c2))
- 云端定时自动保存 + 草稿版本分离 ([6c60d08](https://github.com/yoea/vibe-blog-nextjs/commit/6c60d08e32ee459899dbb4d8c31947ff4a03654c))
- 增强 sitemap 生成，包含标签页和作者页 ([335a0e0](https://github.com/yoea/vibe-blog-nextjs/commit/335a0e0814e82c3215503c66ec6fc5a91a39fbb8))
- 重置密码增加确认对话框，显示昵称和邮箱 ([a21f5f3](https://github.com/yoea/vibe-blog-nextjs/commit/a21f5f302099dcbca6856ddb3407070fb06120be))
- 注册页增加确认密码和强度指示、重置密码页显示用户并强制登出 ([bdf70d4](https://github.com/yoea/vibe-blog-nextjs/commit/bdf70d47eda359a7a9cf6de4d996d43660ed8226))
- 自动保存指示器显示倒计时，空字段不保存 ([0880ad6](https://github.com/yoea/vibe-blog-nextjs/commit/0880ad66379867f15ff48836d36d10fd366a2f75))
- my-posts 重构为个人中心页面，设置页精简 ([c223db2](https://github.com/yoea/vibe-blog-nextjs/commit/c223db2c2a31b41364c4c4cddc2c904a4104af96))

### 其他变更

- 更换许可证为 AGPL-3.0 ([6e60ee8](https://github.com/yoea/vibe-blog-nextjs/commit/6e60ee867ad4fb776ad16976e86d66c7d93e3d58))
- 简化 deploy.sh，移除冗余的 git pull 步骤 ([8222161](https://github.com/yoea/vibe-blog-nextjs/commit/8222161f5df6503d697f730e00e6046e87f4c32f))
- 命令面板移除主题切换功能 ([1a57101](https://github.com/yoea/vibe-blog-nextjs/commit/1a57101a31bfe0ba761f52a29e0ca45de34cb53f))
- 配置 standard-version 版本自动管理 ([beb2f4b](https://github.com/yoea/vibe-blog-nextjs/commit/beb2f4ba7381a209fe8106462d2f5a78bc759118))
- 清理 schema.sql/migrations，由 init.sql 统一替代 ([569888b](https://github.com/yoea/vibe-blog-nextjs/commit/569888b695dd90648f6cd918614549c1393a7a94))
- 删除博客草稿文件 ([02b79ef](https://github.com/yoea/vibe-blog-nextjs/commit/02b79ef7d115bf5ae2ffbe528980f5f8ca62d5bc))
- 设置 deploy.sh 可执行权限 ([61c38a7](https://github.com/yoea/vibe-blog-nextjs/commit/61c38a7561b537140535828367360f0908cc618d))
- 添加部署脚本和 DEPLOY.md，清理 README 旧部署指南和 todo 列表 ([d0bd1e8](https://github.com/yoea/vibe-blog-nextjs/commit/d0bd1e84a0c5b95f316505a240d6841a23939bb8))
- 修改 PM2 端口为 8083 ([ee4ece1](https://github.com/yoea/vibe-blog-nextjs/commit/ee4ece142560f25ed4c3a9990667b0ccaf0485f4))
- 移除本地草稿功能，全面迁移至云端自动保存 ([c62cbea](https://github.com/yoea/vibe-blog-nextjs/commit/c62cbea92a24e00452cbc7d0cf6500de59b23ece))
- 站点更名为"字里行间" ([797e10d](https://github.com/yoea/vibe-blog-nextjs/commit/797e10d0ba3dab324352242423f9dfbb029e8008))
- 整合完整数据库初始化脚本 init.sql ([abd73b8](https://github.com/yoea/vibe-blog-nextjs/commit/abd73b814bb2afc5c2c2ba27e32bd4b778364e59))
- 重置密码文案优化、发送邮件时显示 loading toast ([37ecd9b](https://github.com/yoea/vibe-blog-nextjs/commit/37ecd9bb95f84bb5500e8a4e04873a0abf3c381f))
- 主题切换"跟随系统"图标从 Monitor 换为 SunMoon ([44e8223](https://github.com/yoea/vibe-blog-nextjs/commit/44e8223608544de14723be5ab01d9dacf43db5b3))
- package-lock.json 冲突时自动采用远程版本 ([480f916](https://github.com/yoea/vibe-blog-nextjs/commit/480f9160416513717c9a00367a9460efc571453f))
