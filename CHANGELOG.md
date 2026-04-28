# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.1.3](https://github.com/yoea/vibe-blog-nextjs/compare/v0.1.2...v0.1.3) (2026-04-28)


### 其他变更

* 优化部署流程与 webhook 密钥管理 ([3a95202](https://github.com/yoea/vibe-blog-nextjs/commit/3a9520264e658e846c807001ff26db0b2c2f6fb0))


### Bug 修复

* 更新关于页面与站点地图 ([fe8a02d](https://github.com/yoea/vibe-blog-nextjs/commit/fe8a02d7dda940aa9f7a506456877b5300bacbf3))
* standalone 配置仅在生产构建时启用 ([aab6005](https://github.com/yoea/vibe-blog-nextjs/commit/aab6005847b2dc21e42a753cdc46cba17376b231))

### [0.1.2](https://github.com/yoea/vibe-blog-nextjs/compare/v0.1.1...v0.1.2) (2026-04-28)


### 新功能

* 评论/留言系统重构 - 统一1级嵌套 ([40415b6](https://github.com/yoea/vibe-blog-nextjs/commit/40415b6d18f225bbfa7afa6bbff82a3ae8780d5d))


### Bug 修复

* 回复折叠优化，仅折叠超出1条的回复 ([7544259](https://github.com/yoea/vibe-blog-nextjs/commit/75442595de6750c93d6c255aa3d6436f0129a12c))
* 移动端首页点赞超时 - 放宽 timestamp 校验窗口至60秒 ([aa0aacf](https://github.com/yoea/vibe-blog-nextjs/commit/aa0aacf34236b93442a3794e70f449fb2a09ec2b))

### [0.1.1](https://github.com/yoea/vibe-blog-nextjs/compare/v0.0.1...v0.1.1) (2026-04-28)


### 重构

* 多作者架构改进 — 去除 service_role 依赖、统一权限 ([9cc6ee7](https://github.com/yoea/vibe-blog-nextjs/commit/9cc6ee75425daf387fd0810cb76be149c7934a02))
* 简化部署流程，每次强制清理并重建；schema.sql 增加 ip 列兼容迁移 ([6889878](https://github.com/yoea/vibe-blog-nextjs/commit/6889878a596c35849112dcd90d4f68c832775ebb))
* 提取 AuthorCard 组件，作者页和我的文章页风格统一 ([e10ca0b](https://github.com/yoea/vibe-blog-nextjs/commit/e10ca0be2ad60876be75f076e785cd41b53e326c))
* 提取 DonateButton 自包含组件，统一设置页和网站地图的捐赠入口 ([b7763e8](https://github.com/yoea/vibe-blog-nextjs/commit/b7763e8acc6172868456bddae7772b15da6a10e5))
* 添加 PM2 ecosystem 配置文件管理端口和进程 ([42bcad2](https://github.com/yoea/vibe-blog-nextjs/commit/42bcad257329714093e48b52be6144468b08f8a0))
* 统一 PostCard 组件、文章状态文案更新、标题截断修复 ([9612213](https://github.com/yoea/vibe-blog-nextjs/commit/961221386ff9b9b7ff2fe952b146561c0382e215))
* 文章状态改为"公开发布"/"私密"，编辑页添加状态说明 ([b4b55f0](https://github.com/yoea/vibe-blog-nextjs/commit/b4b55f0964bf04332b6df5464e652ca1a6357f74))
* deploy.sh 改为始终重建 PM2 服务，增加静态资源健康检查 ([720d4b1](https://github.com/yoea/vibe-blog-nextjs/commit/720d4b1fbec44dee2da95f006089df7cf393dfe2))
* my-posts 路由改为 /profile，个人信息卡片重新排版 ([c820515](https://github.com/yoea/vibe-blog-nextjs/commit/c8205153833a0db19b870718d2d55e3a7011e8da))


### 文档

* 更新 README，补充自动部署、留言板等功能说明 ([9b31d6d](https://github.com/yoea/vibe-blog-nextjs/commit/9b31d6d02cab5a34a1cd78d9a8567377eeed2873))
* 恢复 TODO 列表完整项 ([a7f2eb9](https://github.com/yoea/vibe-blog-nextjs/commit/a7f2eb9cfde2274afbbdd718a6c19b7c183c11c8))
* CLAUDE.md 改为中文内容 ([725666d](https://github.com/yoea/vibe-blog-nextjs/commit/725666d508399fbb2b2dbc75856fc377b6f75c3d))


### Bug 修复

* 编辑器文本域自动撑满视口剩余高度，全屏编辑增加源码/预览切换 ([96c59af](https://github.com/yoea/vibe-blog-nextjs/commit/96c59af8f620e37e4dd2399ab58d6c736bac02f0))
* 编辑头像按钮移入头像下方，昵称无变化不调数据库，ESC退出编辑 ([4a63ddb](https://github.com/yoea/vibe-blog-nextjs/commit/4a63ddbba8fd035da2e27697a8895d30d2372ae8))
* 标签管理新建标签添加随机颜色 ([556bc1e](https://github.com/yoea/vibe-blog-nextjs/commit/556bc1e4320ff8bee9d8c8ea81c943096fefb0d0))
* 代码块复制在非HTTPS环境下的兼容性 ([77a08d1](https://github.com/yoea/vibe-blog-nextjs/commit/77a08d11aa4a361fa4768c24fac4700c90ac8564))
* 多项修复 — hydration 警告、命名规范、无障碍、死代码清理 ([39759ac](https://github.com/yoea/vibe-blog-nextjs/commit/39759ac9a750527a1e449b4b52b9a144c60e16fe))
* 更新 schema.sql 匿名点赞 RLS 策略及修复相关 bug ([48ef1b2](https://github.com/yoea/vibe-blog-nextjs/commit/48ef1b27c8dd4ee69e42de17fbabfc5f327b51a2))
* 管理员可删除任意标签，标签可点击跳转 ([ce9dd92](https://github.com/yoea/vibe-blog-nextjs/commit/ce9dd926c2018aa114587afe84986a159e9c265b))
* 加载更多时去重、点赞按钮移至回复前并显示"点赞"文字 ([a12b5fe](https://github.com/yoea/vibe-blog-nextjs/commit/a12b5fe064a97038f083b38febd0e68504e78784))
* 进度条点击同路由链接时不再卡住 ([59c5fa8](https://github.com/yoea/vibe-blog-nextjs/commit/59c5fa84d6a747584485a6cdb66a82d9080e4730))
* 留言板接收者无法删除留言 ([f0c361a](https://github.com/yoea/vibe-blog-nextjs/commit/f0c361a085648fceab5913ca2e10592b6e59146b))
* 评论数量显示使用增量更新，避免被本地已加载数量覆盖 ([f4f4693](https://github.com/yoea/vibe-blog-nextjs/commit/f4f469362b93c65b132721ef143927d6657d408c))
* 切回 Turbopack 构建，添加全局 500 错误页面 ([155e1b4](https://github.com/yoea/vibe-blog-nextjs/commit/155e1b47abc711033ec507b18936d3fdab93abec))
* 删除/新增评论时禁止在 setItems 回调内更新父组件 state ([0486956](https://github.com/yoea/vibe-blog-nextjs/commit/0486956962c1d83fce0a0dd6dc2c938787d44321))
* 删除按钮与卡片内容重叠；删除后用户回到列表的 bug ([44fddc9](https://github.com/yoea/vibe-blog-nextjs/commit/44fddc9dd1e343afd4dd47c3a6e57d2726955669))
* 删除用户未持久化；删除按钮高度不一致 ([e68581c](https://github.com/yoea/vibe-blog-nextjs/commit/e68581cad4cb3e86149a440f0f750e6ec6993b17))
* 使用唯一文件名替代 ?t= 时间戳参数，修复头像缓存与 hydration 警告 ([51b9271](https://github.com/yoea/vibe-blog-nextjs/commit/51b927109f5e6842c680b6c46916cd05c8ae7653))
* 首页文章标题因 CSS Grid 未正确截断省略 ([798056a](https://github.com/yoea/vibe-blog-nextjs/commit/798056ac2dad51cd2f2cc4a6d3c9c1ba68ae4a01))
* 头像预览改用原生 <img> 标签，消除打开卡顿 ([eab85fe](https://github.com/yoea/vibe-blog-nextjs/commit/eab85fec275cb654fd663f8f8f052eb9c7e5f90a))
* 完善点赞 Server Action 错误处理，修复游客点赞不生效 ([c24bc6a](https://github.com/yoea/vibe-blog-nextjs/commit/c24bc6a94f852560ffc4fbd731c80f11f18b4f1d))
* 修复 deploy.sh 中 source 文件变更检测路径 ([6fab387](https://github.com/yoea/vibe-blog-nextjs/commit/6fab387d1b9bd34cb7dc7786e5174511a8b4b8ca))
* 修复 production 部署中 logo.svg 404 和 Turbopack chunk 加载失败的问题 ([e433cd6](https://github.com/yoea/vibe-blog-nextjs/commit/e433cd6fcab56093eb20887e9e1f340c5ca55576))
* 修复 standalone 静态资源复制路径，避免目录嵌套 ([de46249](https://github.com/yoea/vibe-blog-nextjs/commit/de46249f981cb25942906723b247a354cda234ab))
* 修复编辑页面 hydration 不匹配（草稿恢复横幅导致 DOM 结构差异） ([8c798b5](https://github.com/yoea/vibe-blog-nextjs/commit/8c798b59ce866608a10a6e96b14350df2bad9eb4))
* 修复标签保存与详情页间距 ([2d8e508](https://github.com/yoea/vibe-blog-nextjs/commit/2d8e50868d559f0fbe74c4806c515a32c3832d8e))
* 修复多处 Bug 和性能问题 ([f131b2f](https://github.com/yoea/vibe-blog-nextjs/commit/f131b2f8143376ea53bc6b3b35414d9e566a83ab))
* 修复回复嵌套评论时内容不立即显示的问题 ([08ed628](https://github.com/yoea/vibe-blog-nextjs/commit/08ed628f136b543b717d3b4e44b1d738860d7c0e))
* 修复网站地图图标导出错误，分类展示路由页面 ([1816197](https://github.com/yoea/vibe-blog-nextjs/commit/18161974ad6db932fee46f6f461aea0c238c8c6b))
* 修复文章页面 React hydration 错误 [#418](https://github.com/yoea/vibe-blog-nextjs/issues/418) ([65ef0b7](https://github.com/yoea/vibe-blog-nextjs/commit/65ef0b737582a9fcb731d309ab80317498512bfb))
* 移除 webpack 配置改用 --webpack 标志显式指定构建工具 ([759897e](https://github.com/yoea/vibe-blog-nextjs/commit/759897ea8326861c7b5a1ab0ab9cbbcb30543d35))
* 移除客户端路由缓存，修复评论/点赞不刷新 ([49e3b16](https://github.com/yoea/vibe-blog-nextjs/commit/49e3b167b2fe7e2f0544f0696a40ad326b944da2))
* 移动端显示优化 - 编辑工具栏、作者列表、标签间距、版权居中 ([d2327d8](https://github.com/yoea/vibe-blog-nextjs/commit/d2327d8ed1a89e97352c32aca00068e3cd103f68))
* 游客点赞评论无响应 ([96006f7](https://github.com/yoea/vibe-blog-nextjs/commit/96006f7616d7256d5e160692079d7f2c7491eaf0))
* 游客可以回复他人的评论 ([6d88314](https://github.com/yoea/vibe-blog-nextjs/commit/6d883146cb6d4c30b2e558d05307f4862045477d))
* 游客评论昵称参数未传递至 Server Action ([6e240ac](https://github.com/yoea/vibe-blog-nextjs/commit/6e240ac8ff4e3147f56e4a945e163ba9280aaf17))
* 游客评论误显示删除按钮 ([1c00125](https://github.com/yoea/vibe-blog-nextjs/commit/1c00125a8c12652b7b32ccb8601f8a9cd1974aa2))
* 重命名 middleware.ts 为 proxy.ts（Next.js 16 弃用 middleware.ts），删除无用迁移文件 ([e6e6bce](https://github.com/yoea/vibe-blog-nextjs/commit/e6e6bce0f8c9a86cbdd5fa1a38a497e400ad3a8e))
* 重置密码流程优化、设置页按钮重组、注销用户标识改进 ([3871ee6](https://github.com/yoea/vibe-blog-nextjs/commit/3871ee6cf0a9a53e2ae34c75d88ba8a689b6e5b8))
* 重置密码邮件链接跳转修复 ([f1897ef](https://github.com/yoea/vibe-blog-nextjs/commit/f1897ef2f2e6b27684424a616ccce3357978d1c8))
* 注册天数显示去掉"前"字 ([f32705d](https://github.com/yoea/vibe-blog-nextjs/commit/f32705d33fa1ee840d39b7b59ca98d59d35966e8))
* 子评论点赞按钮绑定父级数据的 bug ([d8bde6c](https://github.com/yoea/vibe-blog-nextjs/commit/d8bde6c2ef977de9045034eb0405e10fc56b8e19))
* 作者列表恢复状态显示，已注销用户单独分组 ([b248585](https://github.com/yoea/vibe-blog-nextjs/commit/b2485856fc2cde11179b9627d49335814c791d6a))
* deploy.sh 只重启主应用，不动 webhook 进程；健康检查改用本地端口 ([72c8bc2](https://github.com/yoea/vibe-blog-nextjs/commit/72c8bc23988278c66c44b33854695ca30a1ba7d6))
* markdown 代码块背景使用主题变量，适配深浅色模式 ([57d750b](https://github.com/yoea/vibe-blog-nextjs/commit/57d750b128ca395b9ac792774a503a71deda0dc4))
* proxy.ts 导出函数名从 middleware 改为 proxy（Next.js 16 要求） ([abdb68d](https://github.com/yoea/vibe-blog-nextjs/commit/abdb68d7ebe7c8b4018dca5bf8d0dbf8c9775966))
* RLS 策略、XSS 防护、N+1 查询、类型统一等多项修复 ([962a5f1](https://github.com/yoea/vibe-blog-nextjs/commit/962a5f1f88152ed6dc07d98b9d29a01a118c0b95))
* standalone 部署时手动复制 .next/static 资源目录 ([9ff5dd8](https://github.com/yoea/vibe-blog-nextjs/commit/9ff5dd833f39d76c1547d55e0baf3a8126636b5c))
* webhook 并发保护，新请求自动终止旧部署 ([5088c6c](https://github.com/yoea/vibe-blog-nextjs/commit/5088c6cdc67226e88251ac3c47aa1f66649ec0ed))
* webhook 改为异步部署，先回 202 再后台执行 ([9855d9e](https://github.com/yoea/vibe-blog-nextjs/commit/9855d9e6b60560681e3d528e04ed504d281cf068))
* webhook 监听 0.0.0.0 以接收 Docker 容器请求 ([7d30125](https://github.com/yoea/vibe-blog-nextjs/commit/7d301251f6f18f79d3af2e6e192f379d3aa5af52))


### 新功能

* 标签管理页面与标签系统增强 ([4d279eb](https://github.com/yoea/vibe-blog-nextjs/commit/4d279eb890fcee20d3b12e27f934256fe7be0b2e))
* 超级管理员可通过作者列表直接删除用户 ([d1032fa](https://github.com/yoea/vibe-blog-nextjs/commit/d1032fa9c308918580f1fd4c098d488fb3d7451f))
* 创建隐私政策和法律信息页面 ([2db72e7](https://github.com/yoea/vibe-blog-nextjs/commit/2db72e7c405fb40a00ad433f2a699bc8881a48c2))
* 分享功能重构，sitemap/rss/robots SEO 优化 ([4e83210](https://github.com/yoea/vibe-blog-nextjs/commit/4e832108d7b9d98f9b227108e145a343b45108d5))
* 个人中心加新建文章按钮，文章列表增加置顶操作 ([789b0a8](https://github.com/yoea/vibe-blog-nextjs/commit/789b0a838446a09da1c9380fb3542638c6bbc849))
* 关于页面提取为独立页面 ([35abe08](https://github.com/yoea/vibe-blog-nextjs/commit/35abe0838e282f0a874d382e46ae116f2741c20b))
* 管理员不能删除自己和其他管理员 ([c4bfd7d](https://github.com/yoea/vibe-blog-nextjs/commit/c4bfd7dc42c6bd3e84129fd0839d8d1e765d963c))
* 键盘快捷键适配 - 移动端隐藏提示、不同OS显示对应按键 ([7d44a9d](https://github.com/yoea/vibe-blog-nextjs/commit/7d44a9decb214cd92f32cef0e693d6bc579886c8))
* 列表页头像异步延迟加载，文章列表改为 User 图标 ([7ebdc90](https://github.com/yoea/vibe-blog-nextjs/commit/7ebdc90c39feedd1b3471f8c9ebc2420c24a0acd))
* 面包屑导航 - 文章详情页顶部替换返回按钮 ([94e3905](https://github.com/yoea/vibe-blog-nextjs/commit/94e390540d5c844672ccf9e164906eb0c390b82c))
* 匿名操作频率限制统一改为 10次/小时 ([8aa87a1](https://github.com/yoea/vibe-blog-nextjs/commit/8aa87a1afe5dd903e69caeb5053d0a892af42e42))
* 评论回复 + 评论点赞功能 ([1556335](https://github.com/yoea/vibe-blog-nextjs/commit/15563350f399ffb203d688b95cf3bbc847bb4e52))
* 设置页底部显示构建日期 ([32f2592](https://github.com/yoea/vibe-blog-nextjs/commit/32f259265cae26255d0dec18429afe0ba27942d6))
* 设置页关于卡片显示站点名、构建时间和提交哈希 ([7355010](https://github.com/yoea/vibe-blog-nextjs/commit/73550102178fea701ab59a9b077d9d4056ffbcdb))
* 设置页显示构建信息 ([9e9c477](https://github.com/yoea/vibe-blog-nextjs/commit/9e9c47788a11a107dc290665fc8a540b0c7680f8))
* 实现标签系统 ([5040f04](https://github.com/yoea/vibe-blog-nextjs/commit/5040f04785b3d0d966b077ea5371462d967046f7))
* 首页和我的文章列表改为懒加载 ([0b42da5](https://github.com/yoea/vibe-blog-nextjs/commit/0b42da5a8fdff727bc95fb6ee648021cb58ef8b9))
* 首页未登录时显示游客操作提示 ([5feb2b6](https://github.com/yoea/vibe-blog-nextjs/commit/5feb2b612f1cebfeba5dc6cc56376fb33ed67d16))
* 首页文章列表显示作者名并支持点击跳转，网站地图精简为仅路由页面 ([9eb755f](https://github.com/yoea/vibe-blog-nextjs/commit/9eb755f4f229e4ab5bdba5e02d1d71b694e555ed))
* 提取 SiteHero 组件，增加全站文章统计，同步显示到网站地图 ([f3f6cf1](https://github.com/yoea/vibe-blog-nextjs/commit/f3f6cf1cd79ad9096ecf601c00cbf7edddb794c4))
* 提取LoadMore通用组件、标签页置顶修复、Web Share API支持 ([eb3f477](https://github.com/yoea/vibe-blog-nextjs/commit/eb3f477a1722b442056be2468465654c4b88ca6a))
* 添加 Gitea Webhook 自动部署接收器 ([a43db1e](https://github.com/yoea/vibe-blog-nextjs/commit/a43db1e4916db70b3af6502d82fd2c2bc3933886))
* 添加 Open Graph 元数据，支持微信分享卡片显示标题/摘要/LOGO ([b63178a](https://github.com/yoea/vibe-blog-nextjs/commit/b63178aa4eb721c258b17a5a429fe9954cc903a4))
* 添加默认 OG 分享图 og-image.jpg ([ec5c5fa](https://github.com/yoea/vibe-blog-nextjs/commit/ec5c5fa5ec315f5a22e8e6030fcd9fdd442d9f45))
* 添加用户头像系统，支持上传/裁剪/压缩/全站显示 ([7caeba5](https://github.com/yoea/vibe-blog-nextjs/commit/7caeba541e412a94407bf1ebb86ef8d364333a42))
* 头像支持点击查看大图 ([f623092](https://github.com/yoea/vibe-blog-nextjs/commit/f623092e709960b73658d16e0614d922ca4ed8b6))
* 网站地图页面添加标题并移除 SiteHero 组件 ([2f0a924](https://github.com/yoea/vibe-blog-nextjs/commit/2f0a924a1da2ed93a6f31b38bf242615e2c61bec))
* 文章编辑器自动暂存到 localStorage，支持恢复草稿 ([72799ee](https://github.com/yoea/vibe-blog-nextjs/commit/72799ee5782708bf194cabeefeb317dd2d03c353))
* 文章全文搜索、分享计数、AI摘要改进、自动保存优化 ([a52636e](https://github.com/yoea/vibe-blog-nextjs/commit/a52636e3b0faa2a347f2f623ce25bf6e93d51701))
* 文章详情页标题下方显示摘要 ([de83aa2](https://github.com/yoea/vibe-blog-nextjs/commit/de83aa241f72a82f2f92011300f52ee74d47d83a))
* 文章置顶功能 ([8d34a90](https://github.com/yoea/vibe-blog-nextjs/commit/8d34a9007b659f3ba77d079a46e37e5cfb7ddead))
* 我的文章和设置页面显示管理员标识 ([ee58918](https://github.com/yoea/vibe-blog-nextjs/commit/ee589187c03b8a0c20ba213b4c01c956a275a027))
* 我的文章页标题旁显示文章总数 ([9c10496](https://github.com/yoea/vibe-blog-nextjs/commit/9c10496f7ac100983d96c25584a6525ebdbb5a95))
* 新增命令面板和代码块复制功能 ([66b2382](https://github.com/yoea/vibe-blog-nextjs/commit/66b2382a0b6c233ce79fbd5edfddcf54b96f2130))
* 用户主页留言板、评论懒加载、评论交互组件优化 ([578c76f](https://github.com/yoea/vibe-blog-nextjs/commit/578c76f1ce7411ed8001854565a15ecc67a79092))
* 优化500错误页面，区分维护、部署、超时等场景 ([4db48c5](https://github.com/yoea/vibe-blog-nextjs/commit/4db48c5244b0e49e384cdfe2ba833c26f98fa776))
* 游客可点赞评论（IP 去重） ([3f67fe3](https://github.com/yoea/vibe-blog-nextjs/commit/3f67fe3c1b2efbace36f0ebc7fc7f5251151c1b6))
* 游客昵称存入 localStorage 自动填充 ([6ad3bda](https://github.com/yoea/vibe-blog-nextjs/commit/6ad3bda27949c6cc37022b21c760461b093938ed))
* 游客评论与留言功能 ([15d0c57](https://github.com/yoea/vibe-blog-nextjs/commit/15d0c57966efb011cb8c2a5ab031f66d373585c2))
* 云端定时自动保存 + 草稿版本分离 ([6c60d08](https://github.com/yoea/vibe-blog-nextjs/commit/6c60d08e32ee459899dbb4d8c31947ff4a03654c))
* 增强 sitemap 生成，包含标签页和作者页 ([335a0e0](https://github.com/yoea/vibe-blog-nextjs/commit/335a0e0814e82c3215503c66ec6fc5a91a39fbb8))
* 重置密码增加确认对话框，显示昵称和邮箱 ([a21f5f3](https://github.com/yoea/vibe-blog-nextjs/commit/a21f5f302099dcbca6856ddb3407070fb06120be))
* 注册页增加确认密码和强度指示、重置密码页显示用户并强制登出 ([bdf70d4](https://github.com/yoea/vibe-blog-nextjs/commit/bdf70d47eda359a7a9cf6de4d996d43660ed8226))
* 自动保存指示器显示倒计时，空字段不保存 ([0880ad6](https://github.com/yoea/vibe-blog-nextjs/commit/0880ad66379867f15ff48836d36d10fd366a2f75))
* my-posts 重构为个人中心页面，设置页精简 ([c223db2](https://github.com/yoea/vibe-blog-nextjs/commit/c223db2c2a31b41364c4c4cddc2c904a4104af96))


### 其他变更

* 更换许可证为 AGPL-3.0 ([6e60ee8](https://github.com/yoea/vibe-blog-nextjs/commit/6e60ee867ad4fb776ad16976e86d66c7d93e3d58))
* 简化 deploy.sh，移除冗余的 git pull 步骤 ([8222161](https://github.com/yoea/vibe-blog-nextjs/commit/8222161f5df6503d697f730e00e6046e87f4c32f))
* 命令面板移除主题切换功能 ([1a57101](https://github.com/yoea/vibe-blog-nextjs/commit/1a57101a31bfe0ba761f52a29e0ca45de34cb53f))
* 配置 standard-version 版本自动管理 ([beb2f4b](https://github.com/yoea/vibe-blog-nextjs/commit/beb2f4ba7381a209fe8106462d2f5a78bc759118))
* 清理 schema.sql/migrations，由 init.sql 统一替代 ([569888b](https://github.com/yoea/vibe-blog-nextjs/commit/569888b695dd90648f6cd918614549c1393a7a94))
* 删除博客草稿文件 ([02b79ef](https://github.com/yoea/vibe-blog-nextjs/commit/02b79ef7d115bf5ae2ffbe528980f5f8ca62d5bc))
* 设置 deploy.sh 可执行权限 ([61c38a7](https://github.com/yoea/vibe-blog-nextjs/commit/61c38a7561b537140535828367360f0908cc618d))
* 添加部署脚本和 DEPLOY.md，清理 README 旧部署指南和 todo 列表 ([d0bd1e8](https://github.com/yoea/vibe-blog-nextjs/commit/d0bd1e84a0c5b95f316505a240d6841a23939bb8))
* 修改 PM2 端口为 8083 ([ee4ece1](https://github.com/yoea/vibe-blog-nextjs/commit/ee4ece142560f25ed4c3a9990667b0ccaf0485f4))
* 移除本地草稿功能，全面迁移至云端自动保存 ([c62cbea](https://github.com/yoea/vibe-blog-nextjs/commit/c62cbea92a24e00452cbc7d0cf6500de59b23ece))
* 站点更名为"字里行间" ([797e10d](https://github.com/yoea/vibe-blog-nextjs/commit/797e10d0ba3dab324352242423f9dfbb029e8008))
* 整合完整数据库初始化脚本 init.sql ([abd73b8](https://github.com/yoea/vibe-blog-nextjs/commit/abd73b814bb2afc5c2c2ba27e32bd4b778364e59))
* 重置密码文案优化、发送邮件时显示 loading toast ([37ecd9b](https://github.com/yoea/vibe-blog-nextjs/commit/37ecd9bb95f84bb5500e8a4e04873a0abf3c381f))
* 主题切换"跟随系统"图标从 Monitor 换为 SunMoon ([44e8223](https://github.com/yoea/vibe-blog-nextjs/commit/44e8223608544de14723be5ab01d9dacf43db5b3))
* package-lock.json 冲突时自动采用远程版本 ([480f916](https://github.com/yoea/vibe-blog-nextjs/commit/480f9160416513717c9a00367a9460efc571453f))
