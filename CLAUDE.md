# CLAUDE.md

为 Claude Code (claude.ai/code) 提供的项目指引。

##  开发者信息

使用简体中文，要求回答时保持专业、简洁。

开发者名叫Ethan/伊森。

要求每次claude code启动本项目之后，先运行npm run dev以启动开发服务器运行

## 常用命令

```bash
npm run dev        # 启动开发服务器 (监听所有网卡)
npm run build      # 构建生产版本
npm run lint       # ESLint 检查
npx tsc --noEmit   # TypeScript 类型检查
npm run release         # 发版 (自动 bump + CHANGELOG + commit + tag)
npm run release:minor   # minor 版本 (0.x.0)
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

| 文件 | 触发条件 | 功能 |
|------|---------|------|
| `ci.yml` | push/PR to main | ESLint + TypeScript 类型检查 |
| `release.yml` | push tag `v*` | 自动创建 GitHub Release，从 CHANGELOG.md 提取该版本的更新内容（新功能、修复、重构等）作为 release notes |

> **CHANGELOG 格式**：standard-version 对 minor/major 生成 `## [0.5.0]`（两级标题），对 patch 生成 `### [0.4.3]`（三级标题）。release.yml 的 sed 提取使用 `^#{2,3}` 兼容两种格式。Release 标题直接使用 `${{ github.ref_name }}`（已含 `v` 前缀，无需再加）。
>
> **注意**：release workflow 执行的是 **tag 所指向提交** 的代码。如果 workflow 修复提交在 tag 之后，必须 `git tag -f` 将 tag 移到包含修复的提交，否则修复不生效。

## 项目架构

### 技术栈
- **框架**: Next.js 16 (App Router), React 19
- **数据库**: Supabase (PostgreSQL) + RLS 行级安全策略
- **认证**: Supabase Auth (PKCE 流程) via `@supabase/ssr`
- **样式**: Tailwind CSS v4 (CSS 配置模式, 无 tailwind.config.*), shadcn/ui (base-nova 风格)
- **图标**: Lucide React

### 路由结构

| 路由分组 | 页面 |
|---------|------|
| `(auth)/` | login, register, settings (需登录) |
| `(blog)/` | 首页, posts/[slug] (详情), posts/new, posts-edit/[slug], my-posts |
| `author/` | 作者列表, author/[authorId] (个人页 + 留言板) |
| `api/` | auth/callback, generate-summary, generate-tags, healthz, site-stats, my-ip |

### Supabase 客户端 (src/lib/supabase/)

| 文件 | 用途 |
|------|------|
| `client.ts` | `createBrowserClient` — 浏览器端 (client components) |
| `server.ts` | `createServerClient` — 服务端组件 & Server Actions |
| `admin.ts` | Service Role 客户端 — 管理员操作 (列出用户、删除账号) |
| `middleware.ts` | `updateSession()` — 每个请求的 cookie 管理 |

### 数据流

1. **读取**: 服务端组件直接查询 Supabase, 将数据通过 props 传给客户端组件
2. **写入**: Server Actions (`'use server'` in `src/lib/actions/`) 统一返回 `ActionResult = { error?: string }`
3. **缓存**: 公开页面用 `revalidate = 300`; 修改后调用 `revalidatePath()` 清除缓存

### 关键设计模式

- **评论/留言板**: 2 层嵌套, 从扁平 DB 查询结果在客户端构建树结构
- **文章点赞**: 双重追踪 — 登录用户用 `user_id`, 匿名用户用 `ip`, 唯一约束防重复
- **主题**: Context Provider 支持 light/dark/system, 通过 localStorage + cookie 持久化
- **Markdown**: `react-markdown` + remark-gfm + rehype-sanitize + rehype-highlight

### 部署架构

- **双远程推送**: `git push` 同时推送到 GitHub 和 Gitee，两个远程都会触发 webhook
- **自动部署**: 本地构建 + 上传方式（`npm run deploy:local`），详见 `doc/deploy.md`
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

**表**: posts, post_likes, post_comments, comment_likes, user_settings, post_drafts, site_views, site_likes, guestbook_messages, site_config

**触发器**: 自动更新 `updated_at`; 注册时自动创建 `user_settings` 行

**RLS**: 所有表启用行级安全策略, 详见 init.sql

## 环境变量

| 变量 | 必填 | 范围 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 是 | 客户端+服务端 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 是 | 客户端+服务端 |
| `SUPABASE_SERVICE_ROLE_KEY` | 是 | 仅服务端 |
| `NEXT_PUBLIC_SITE_TITLE` | 是 | 客户端+服务端 |
| `NEXT_PUBLIC_SITE_URL` | 是 | 客户端+服务端 |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | 否 | 客户端+服务端 |

> AI 配置（API Key、Base URL、Model）已迁移到数据库 `site_config` 表，通过管理后台设置页面管理，不再使用环境变量。
