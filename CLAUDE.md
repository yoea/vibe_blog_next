# CLAUDE.md

为 Claude Code (claude.ai/code) 提供的项目指引。
这是一个基于 Next.js + Supabase 的个人博客系统，设计目标是同时支持人类用户和 AI Agent（例如OpenClaw、Hermes-agent等基于 Playwright 的自动化 Agent）操作。

## 语言偏好

- 使用简体中文回复。

## 核心原则

本项目从设计之初就面向 AI Agent 友好。
在新增或修改功能时，必须默认考虑：

- 人类用户通过 UI 使用系统
- AI Agent 可能通过 UI 自动化或 API 使用系统

### UI 规范（面向 Agent 的可操作 UI）

#### 所有 UI 必须具备机器可识别能力：

- 所有交互元素必须包含 data-testid
- 仅图标按钮必须提供 aria-label
- 使用语义化 HTML（如 button、nav、main、section）
- 避免模糊或动态生成的选择器

#### 每个页面必须具备清晰的层级结构：

- header（头部）
- navigation（导航）
- content area（内容区）
- editor area（编辑区，如适用）
- 避免深层嵌套或不稳定的 DOM 结构
- 保持关键区域结构稳定，便于自动化操作

## 常用命令

```bash
npm run dev        # 启动开发服务器 (监听所有网卡)
npm run build      # 构建生产版本
npm run start      # 启动生产服务器
npm run lint       # ESLint 检查
npm run format     # Prettier 格式化（统一缩进、换行符、引号风格）
npm run format:check   # Prettier 仅检查不修改（CI 用）
npx tsc --noEmit   # TypeScript 类型检查
npm run sitemap:generate   # 生成网站地图
npm run release         # 发版 (自动 bump + CHANGELOG + commit + tag)
npm run release:minor   # minor 版本 (0.x.0)
npm run release:major   # major 版本 (x.0.0)
npm run release:patch   # patch 版本 (0.0.x)
npm run deploy:local    # 本地构建 + 上传部署
```

## 发版规范（强制）

当用户说"发版"时，**必须**执行 `npm run release` 系列命令，**禁止**手动创建 git tag。

流程：

1. `npm run release:minor`（或 `:patch`，视语义而定）
   - standard-version 自动 bump `package.json` 版本号
   - 自动生成/更新 `CHANGELOG.md`
   - 创建 `chore: release vX.Y.Z` commit
   - postrelease.js 创建附注 git tag（含 CHANGELOG 内容）
2. `git push --follow-tags origin main` 推送到 Gitee
3. `git push --follow-tags github main` 推送到 GitHub
4. GitHub Actions 自动创建 Release（从 CHANGELOG.md 提取更新内容作为 release notes）

版本号唯一来源是 `package.json` 的 `version` 字段，构建时通过 `deploy-local.mjs` 注入 `NEXT_PUBLIC_BUILD_VERSION`。Git tag 只是标记，不参与版本显示。

### GitHub Actions（`.github/workflows/`）

| 文件          | 触发条件        | 功能                                                                                                    |
| ------------- | --------------- | ------------------------------------------------------------------------------------------------------- |
| `ci.yml`      | push/PR to main | ESLint + TypeScript 类型检查                                                                            |
| `release.yml` | push tag `v*`   | 自动创建 GitHub Release，从 CHANGELOG.md 提取该版本的更新内容（新功能、修复、重构等）作为 release notes |

> **CHANGELOG 格式**：standard-version 对 minor/major 生成 `## [0.5.0]`（两级标题），对 patch 生成 `### [0.4.3]`（三级标题）。release.yml 的 sed 提取使用 `^#{2,3}` 兼容两种格式。Release 标题直接使用 `${{ github.ref_name }}`（已含 `v` 前缀，无需再加）。
>
> **注意**：release workflow 执行的是 **tag 所指向提交** 的代码。如果 workflow 修复提交在 tag 之后，必须 `git tag -f` 将 tag 移到包含修复的提交，否则修复不生效。

## 项目架构

### 技术栈

- **框架**: Next.js 16 (App Router), React 19
- **数据库**: Supabase (PostgreSQL) + RLS 行级安全策略
- **认证**: Supabase Auth (PKCE 流程) via `@supabase/ssr`
- **样式**: Tailwind CSS v4 (CSS 配置模式, 无 tailwind.config.\*), shadcn/ui (base-nova 风格)
- **图标**: Lucide React

### 路由结构

| 路由分组  | 页面                                                                                                      |
| --------- | --------------------------------------------------------------------------------------------------------- |
| `(auth)/` | login, register, settings (需登录)                                                                        |
| `(blog)/` | 首页, posts/[slug] (详情), posts/new, posts-edit/[slug], profile, tags, tags/[slug]                       |
| `author/` | 作者列表, author/[authorId] (个人页 + 留言板)                                                             |
| 其他      | about, legal, privacy, sitemap, maintenance, unauthorized                                                 |
| `admin/`  | archive (归档管理)                                                                                        |
| `api/`    | auth/callback, check-like, generate-summary, generate-tags, healthz, my-ip, search, shares, site-stats, check-deepseek-balance, test-ai-config |
| `api/v1/` | **Bot RESTful API** — posts CRUD, comments, likes, whoami（Bearer Token 认证，多密钥管理） |

### 目录结构 (src/)

| 路径                         | 用途                                                  |
| ---------------------------- | ----------------------------------------------------- |
| `lib/supabase/client.ts`     | `createBrowserClient` — 浏览器端 (client components)  |
| `lib/supabase/server.ts`     | `createServerClient` — 服务端组件 & Server Actions    |
| `lib/supabase/admin.ts`      | Service Role 客户端 — 管理员操作 (列出用户、删除账号) |
| `lib/supabase/middleware.ts` | `updateSession()` — 每个请求的 cookie 管理            |
| `lib/actions/`               | Server Actions — 文章、评论、点赞、认证、设置等       |
| `lib/api/`                   | API 认证 Helper — `validateApiKey()` 返回 `{ userId, keyId }` |
| `lib/db/`                    | 数据库查询 (queries.ts) 与类型定义 (types.ts)         |
| `lib/utils/`                 | 工具函数 — 剪贴板、颜色、时间、频率限制、日志等       |
| `lib/hooks/`                 | 客户端 hooks — 自动保存草稿                           |
| `lib/ai-config.ts`           | AI 配置解析工具                                       |
| `lib/utils.ts`               | 通用工具函数                                          |
| `lib/build-info.ts`          | 构建元数据（版本、commit、时间等）                    |
| `lib/constants.ts`           | 常量定义                                              |
| `lib/site-url.ts`            | 站点 URL 解析工具                                     |

### 数据流

1. **读取**: 服务端组件直接查询 Supabase, 将数据通过 props 传给客户端组件
2. **写入**: Server Actions (`'use server'` in `src/lib/actions/`) 统一返回 `ActionResult<T = {}> = T & { error?: string; error_code?: ErrorCode }`
3. **缓存**: 公开页面用 `revalidate = 300`; 修改后调用 `revalidatePath()` 清除缓存

### 错误码系统

所有 Server Actions 和 API Routes 返回统一的错误码枚举 (`src/lib/db/types.ts`)：

| error_code     | 含义         | 触发条件                       |
| -------------- | ------------ | ------------------------------ |
| `UNAUTHORIZED` | 未登录       | 需要登录的操作被匿名访问       |
| `FORBIDDEN`    | 无权限       | 非作者删除文章、非管理员操作等 |
| `NOT_FOUND`    | 资源不存在   | 文章/评论/标签/留言 未找到     |
| `VALIDATION`   | 参数校验失败 | 空内容、超长度、格式错误       |
| `RATE_LIMITED` | 频率限制     | 发布/评论/点赞 过于频繁        |
| `CONFLICT`     | 冲突         | 标签已存在等                   |
| `SERVER_ERROR` | 服务端错误   | 数据库异常、配置错误等         |

**使用示例**（AI Agent 可按 `error_code` 分支处理）：

```typescript
const result = await savePost(formData);
if (result.error_code === 'RATE_LIMITED') {
  /* 等待后重试 */
}
if (result.error_code === 'UNAUTHORIZED') {
  /* 重新登录 */
}
```

### Bot RESTful API（`src/app/api/v1/`）

提供基于 API Key 的编程访问接口，每个管理员可生成多个独立密钥，`author_id` 由密钥自动确定。

| 方法     | 路径                           | 功能                                    |
| -------- | ------------------------------ | --------------------------------------- |
| `GET`    | `/api/v1/posts`                | 列出文章（分页：`?page=1&pageSize=10`） |
| `GET`    | `/api/v1/posts/:slug`          | 获取单篇文章                            |
| `POST`   | `/api/v1/posts`                | 创建文章                                |
| `PUT`    | `/api/v1/posts/:slug`          | 更新文章                                |
| `DELETE` | `/api/v1/posts/:slug`          | 删除文章                                |
| `POST`   | `/api/v1/posts/:slug/comments` | 添加评论                                |
| `DELETE` | `/api/v1/comments/:id`         | 删除评论                                |
| `POST`   | `/api/v1/posts/:slug/like`     | 切换点赞                                |
| `GET`    | `/api/v1/whoami`               | 获取当前 key 拥有者的用户信息           |

**认证方式**：`Authorization: Bearer <api_key>`

**管理**：管理员在设置页 → "本站API KEY" → 点击"生成密钥"，可为每个密钥命名方便区分用途。

**完整 API 文档**：`/api/v1/openapi.json`（OpenAPI 3.0 规范，AI Agent 可直接解析）

### AI Agent 自发现文档

| 文件                         | 路径                   | 用途                                                                       |
| ---------------------------- | ---------------------- | -------------------------------------------------------------------------- |
| `public/llms.txt`            | `/llms.txt`            | 站点说明书：页面结构、data-testid 约定、API 端点列表、错误码枚举、认证方式 |
| `public/api/v1/openapi.json` | `/api/v1/openapi.json` | OpenAPI 3.0 规范：所有 v1 端点的请求/响应 schema、认证 scheme              |

> AI Agent 不会自动发现这些文件，需要在系统提示中告知 Agent 先读取 `/llms.txt`。

### 关键设计模式

- **评论/留言板**: 2 层嵌套, 从扁平 DB 查询结果在客户端构建树结构
- **文章点赞**: 双重追踪 — 登录用户用 `user_id`, 匿名用户用 `ip`, 唯一约束防重复
- **主题**: Context Provider 支持 light/dark/system, 通过 localStorage + cookie 持久化
- **Markdown**: `react-markdown` + remark-gfm + rehype-sanitize + rehype-highlight

### 部署架构

- **双远程推送**: `git push` 同时推送到 GitHub 和 Gitee，两个远程都会触发 webhook
- **自动部署**: 本地构建 + 上传方式（`npm run deploy:local`），详见 `docs/deploy-tips.md`
- **deploy-local.mjs 流程**: 本地 `next build` → 组装 standalone → tar 打包（--exclude 开发文件）→ scp 上传 → ssh 触发 `deploy-remote.sh`（成功后保留 tar 包供下次覆盖）
  - Windows 兼容: 临时脚本使用进程 ID 避免并行冲突，tarball 验证处理换行符
- **deploy-remote.sh 流程**: flock 加锁 → 校验产物 → 原子替换文件 → pm2 delete + start（重建主应用 + webhook）→ 健康检查（严格验证 commit hash）→ 清理
  - 健康检查失败时自动回滚，回滚后二次验证服务状态
  - 每次部署同时重建 webhook 服务，确保脚本变更生效
- **代码同步**: webhook-server.js 监听分支推送，自动 `git pull` 保持服务端代码同步（不触发构建）
- **PM2 双进程** (`ecosystem.config.js`):
  - `vibe_blog_next` — Next.js standalone server（端口 8083），max 512MB 自动重启
  - `webhook` — webhook 接收服务（端口 8084），分支推送自动拉取代码
- **crontab @reboot**: 配置了 `pm2 resurrect` 开机自启

### 数据库 (supabase/init.sql)

**表**: posts, post_likes, post_comments, comment_likes, user_settings, post_drafts, site_views, site_likes, guestbook_messages, site_config, api_keys, notifications, post_tags

**触发器**: 自动更新 `updated_at`; 注册时自动创建 `user_settings` 行

**RLS**: 所有表启用行级安全策略, 详见 init.sql

## 环境变量

| 变量                                   | 必填 | 范围                                  |
| -------------------------------------- | ---- | ------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | 是   | 客户端+服务端                         |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 是   | 客户端+服务端                         |
| `SUPABASE_SERVICE_ROLE_KEY`            | 是   | 仅服务端                              |
| `NEXT_PUBLIC_SITE_TITLE`               | 是   | 客户端+服务端                         |
| (副标题)                               | —    | 管理员在个人中心设置 MOTD，存入数据库 |
| `NEXT_PUBLIC_BUILD_VERSION`            | 否   | 构建时注入                            |
| `NEXT_PUBLIC_BUILD_COMMIT`             | 否   | 构建时注入                            |
| `NEXT_PUBLIC_BUILD_COMMIT_COUNT`       | 否   | 构建时注入                            |
| `NEXT_PUBLIC_BUILD_CONTRIBUTORS`       | 否   | 构建时注入                            |
| `NEXT_PUBLIC_BUILD_TIME`               | 否   | 构建时注入                            |
| `NEXT_PUBLIC_BUILD_HOST`               | 否   | 构建时注入                            |

> AI 配置（API Key、Base URL、Model）已迁移到数据库 `site_config` 表，通过管理后台设置页面管理，不再使用环境变量。

## Bug 修复协议

在建议修复方案之前，先追踪目标变量/prop 在所有文件中的完整生命周期：

1. **Grep 查找所有赋值** — 找到该变量被写入的每一处
2. **读取每个赋值点** — 理解上下文和调用时序
3. **解释根本原因** — 说明原始值为何缺失/错误，而非修复表象
4. **然后修复** — 基于根因给出方案

避免：不清楚根因就加回退值、可选链、空值合并等"防御性修补"。

## 配置变更审计

每次完成配置更改后（`.claude/`、`.vscode/`、`.github/`、`package.json`、`tsconfig` 等），展开审计：

1. **识别关联文件** — 列出可能受此配置影响的其他文件
2. **检查并修复冲突** — 全局 grep 相关 key/字段，确保无残留旧值或矛盾配置
3. **验证一致性** — 确保 CI、编辑器、git hooks、npm scripts 之间配置一致

## 文档维护

- 每当代码变更影响到项目设置、依赖项、构建步骤或开发人员入职流程时，请主动更新 README.md。不要等待被要求才去更新。

## 编辑偏好

- 优先使用 Edit 工具进行针对性更改（如单函数重构、添加属性、修复特定行）。仅在创建新文件或重写整个文件时使用 Write。这有助于保留周围的格式，并且更节省 Token。
