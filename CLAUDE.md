# CLAUDE.md

为 Claude Code (claude.ai/code) 提供的项目指引。

##  开发者信息

使用简体中文，要求回答时保持专业、简洁。

开发者名叫Ethan/伊森。

## 常用命令

```bash
npm run dev        # 启动开发服务器 (监听所有网卡)
npm run build      # 构建生产版本
npm run lint       # ESLint 检查
npx tsc --noEmit   # TypeScript 类型检查
```

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
| `api/` | auth/callback, generate-summary, site-stats, my-ip |

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
- **自动部署**: GitHub/Gitee 创建 tag 推送 → webhook-server.js → `git pull` + `bash deploy.sh`
- **deploy.sh 流程**:
  1. 检查 `package-lock.json` hash，无变更则跳过 `npm ci`
  2. `rm -rf node_modules`（防止 npm ENOTEMPTY 错误）
  3. `pm2 stop vibe_blog_next` + 启动维护页（端口 8083 返回维护页面）
  4. 注入 `NEXT_PUBLIC_BUILD_*` 环境变量 → `next build`
  5. 复制 `public/` 和 `.next/static` 到 standalone 目录
  6. `pm2 start` 新版本 + 健康检查
- **PM2 双进程** (`ecosystem.config.js`):
  - `vibe_blog_next` — Next.js standalone server（端口 8083），每次部署重建
  - `webhook` — webhook 接收服务（端口 8084），部署成功后自重启
- **维护模式**: 构建期间 `maintenance-server.js` 接管端口 8083 显示维护页，构建完成恢复
- **crontab @reboot**: 配置了 `pm2 resurrect` 开机自启

### 数据库 (supabase/init.sql)

**表**: posts, post_likes, post_comments, comment_likes, user_settings, post_drafts, site_views, site_likes, guestbook_messages

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
| `OPENAI_API_KEY` | 否 | 服务端 (摘要生成) |
| `OPENAI_BASE_URL` | 否 | 服务端 |
| `OPENAI_MODEL` | 否 | 服务端 (默认: gpt-4o-mini) |
| `SUPER_ADMIN_EMAILS` | 否 | 服务端 (超级管理员，多个用逗号分隔) |
