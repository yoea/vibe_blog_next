# 字里行间-博文

一个专门为 AI Agent 操作优化开发的基于 Next.js 16 + Supabase 的个人博客系统。

## 仓库地址

- **GitHub**: https://github.com/yoea/vibe_blog_next
- **Gitee**: https://git.ewing.top/yoea/vibe_blog_next

## 功能特性

- 用户注册/登录/密码重置
- Markdown 文章发布与预览（自动保存草稿）
- 文章封面图上传与裁剪（16:9，滚动揭示动画）
- AI 一键生成文章摘要 + 标签推荐（兼容 OpenAI API）
- 全站 OG/Twitter 社交分享标签
- 文章点赞与评论（无需登录也可点赞）
- 评论/留言回复（2 层嵌套，树形展示）
- Markdown 代码块语法高亮（highlight.js，github-dark-dimmed 主题）
- 个人中心：头像上传、昵称编辑、文章管理、他人留言
- 作者主页：头像首字、昵称、注册时间、文章数、留言板
- 首页站点统计（访问量 + 点赞数，IP 去重 + 频率限制）
- 作者列表页（莫兰迪色系用户标识 + 活跃/注销状态）
- 移动端响应式适配（汉堡菜单、溢出修复）
- 用户设置：注销账号、主题切换（亮/暗/跟随系统）
- 匿名操作频率限制（10次/小时）
- ISR 5 分钟缓存，缓解 Supabase Free Tier 冷启动延迟
- **AI Agent 友好**：全站 data-testid + aria-label + 语义化 HTML
- **RESTful API**：Bearer Token 认证，支持文章 CRUD + 评论 + 点赞
- **错误码标准化**：UNAUTHORIZED / FORBIDDEN / NOT_FOUND / VALIDATION / RATE_LIMITED / CONFLICT / SERVER_ERROR
- **AI Agent 自发现**：`/llms.txt`（站点说明书） + `/api/v1/openapi.json`（API 规范）

## 技术栈

- **前端**: Next.js 16 (App Router), React 19, Tailwind CSS v4
- **后端**: Supabase (PostgreSQL, Auth, RLS)
- **UI**: shadcn/ui, Lucide Icons, Sonner Toast
- **Markdown**: react-markdown + remark-gfm + remark-breaks + rehype-highlight

## 本地开发

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.local.example` 为 `.env.local` 并填入所有配置项

> Supabase 密钥在项目 Dashboard → **Settings → API** 页面获取。
> `SUPABASE_SERVICE_ROLE_KEY` 用于作者列表等管理功能，仅在服务端使用。
> `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL` 用于 AI 摘要生成，兼容 OpenAI API。
> `SUPER_ADMIN_EMAILS` 用于指定超级管理员（多个用逗号分隔）。
> 监听地址和端口通过 `package.json` 的 scripts 控制（`-H 0.0.0.0`），无需额外配置。

### 3. 初始化数据库

在 Supabase Dashboard 的 **SQL Editor** 中执行 `supabase/init.sql`，创建所有表和 RLS 策略。

### 4. 代码格式化

项目使用 EditorConfig + Prettier 统一代码风格，配置了 2 空格缩进、LF 换行符、单引号、尾逗号。

```bash
npm run format         # 自动格式化所有代码
npm run format:check   # 仅检查，不修改文件（CI 用）
```

Prettier 自动读取 `.editorconfig` 的通用规范，`.prettierrc` 负责 JS/TS 特有规则。

### 5. 检查与构建

```bash
npm run lint           # ESLint 代码检查
npm run build          # 生产环境构建
npm run start          # 启动生产服务器（需先 build）
```

### 6. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 访问。

---

## 生产环境部署

生产环境使用 PM2 + Next.js Standalone 模式运行，nginx 反向代理。

### 架构

```
用户 → nginx (443) → PM2 (8083) → .next/standalone/server.js
本地构建 → scp 上传 → ssh 触发 deploy-remote.sh → PM2 重建（delete + start）
Git Push → Webhook (8084) → 仅拉取代码（不构建不部署）
```

### 部署步骤

```bash
# 本地一键部署（构建 + 上传 + 服务端重启）
npm run deploy:local
```

详细部署文档见 [docs/deploy-tips.md](docs/deploy-tips.md)。

### 自动代码同步

项目配置了双远程推送（GitHub / Gitea），分支推送时 webhook 自动拉取代码保持服务端同步。
部署不再通过 webhook 自动触发，改为本地构建 + 上传方式。

### PM2 管理

```bash
pm2 list                                       # 查看所有进程
pm2 show <name>                                # 查看进程详情（日志路径、运行模式等）

pm2 logs <name>                                # 查看实时日志流
pm2 logs <name> --lines 50                     # 查看最近 50 行
pm2 logs <name> --timestamp --lines 50         # 查看带时间戳的最近 50 行

pm2 start scripts/ecosystem.config.js --only <name>    # 启动指定进程
pm2 restart <name>                             # 重启指定进程
pm2 stop <name>                                # 停止指定进程

pm2 save                                       # 保存当前进程列表
pm2 startup                                    # 配置开机自启
pm2 resurrect                                  # 恢复保存的进程列表
```

#### 日志说明

| 进程             | 日志路径                               | 内容                                          |
| ---------------- | -------------------------------------- | --------------------------------------------- |
| `vibe_blog_next` | `~/.pm2/logs/vibe-blog-next-out.log`   | 应用访问日志                                  |
| `vibe_blog_next` | `~/.pm2/logs/vibe-blog-next-error.log` | 应用错误日志                                  |
| `webhook`        | `~/.pm2/logs/webhook-out.log`          | Webhook 请求 + 部署输出（带 `[deploy]` 前缀） |
| `webhook`        | `~/.pm2/logs/webhook-error.log`        | 部署过程中的 stderr 输出                      |

##### 常用命令

推送标签后，可立即使用以下命令查看服务器日志，包含deploy.sh的输出

`pm2 logs webhook --lines 30`

**常见问题：**

- **Server Action 错误** — 旧浏览器缓存导致，等待用户刷新页面后自动恢复，无需处理
- **`Failed to find Server Action`** — 新部署后旧页面发起的请求，无害

## 缓存策略

为缓解 Supabase Free Tier 的冷启动延迟，项目已配置 ISR（增量静态再生成）缓存：

| 页面                       | 缓存时间 | 说明                                 |
| -------------------------- | -------- | ------------------------------------ |
| 首页 `/`                   | 5 分钟   | `revalidate = 300`                   |
| 文章详情页 `/posts/[slug]` | 5 分钟   | `revalidate = 300`                   |
| 其他页面                   | 无缓存   | 实时数据（管理页、编辑器、设置页等） |

- 缓存期内刷新页面直接返回缓存的 HTML，**不查询 Supabase**
- 发布/编辑/删除文章后，`revalidatePath` 会自动清除相关缓存
- 点赞/评论等交互通过 Server Actions + 乐观 UI 处理，不受服务端缓存影响
- 如需调整缓存时间，修改对应页面文件中的 `revalidate` 值即可

---

## AI Agent 编程访问

### 快速开始

AI Agent（OpenClaw、Hermes-Agent、Claude Code 等）可通过以下方式操作本网站：

**UI 自动化路径：** 所有交互元素均有 `data-testid` 和 `aria-label`，无需依赖 CSS 类名定位。

**API 路径：** 获取 API Key → 调用 RESTful 端点。

### 获取 API Key

1. 管理员登录 → 设置 → 本站API KEY → 立即生成
2. 弹窗显示完整 Key（`ew-` 开头），复制保存
3. 请求时携带：`Authorization: Bearer ew-xxxxxxxx`

### API 端点

| method | path                               | 说明     |
| ------ | ---------------------------------- | -------- |
| GET    | `/api/v1/posts?page=1&pageSize=10` | 文章列表 |
| POST   | `/api/v1/posts`                    | 创建文章 |
| GET    | `/api/v1/posts/{slug}`             | 获取文章 |
| PUT    | `/api/v1/posts/{slug}`             | 更新文章 |
| DELETE | `/api/v1/posts/{slug}`             | 删除文章 |
| POST   | `/api/v1/posts/{slug}/comments`    | 添加评论 |
| DELETE | `/api/v1/comments/{id}`            | 删除评论 |
| POST   | `/api/v1/posts/{slug}/like`        | 切换点赞 |

### 错误码

所有 API 返回统一格式：

```json
{ "error": "中文错误描述", "error_code": "UNAUTHORIZED" }
```

| error_code   | HTTP | 含义                         |
| ------------ | ---- | ---------------------------- |
| UNAUTHORIZED | 401  | 未认证（API Key 缺失或无效） |
| FORBIDDEN    | 403  | 无权限                       |
| NOT_FOUND    | 404  | 资源不存在                   |
| VALIDATION   | 400  | 参数校验失败                 |
| RATE_LIMITED | 429  | 频率限制                     |
| CONFLICT     | 409  | 资源冲突                     |
| SERVER_ERROR | 500  | 服务端错误                   |

### AI Agent 自发现文档

| 文件     | 路径                   | 用途                                                 |
| -------- | ---------------------- | ---------------------------------------------------- |
| llms.txt | `/llms.txt`            | 站点级说明书（页面结构、data-testid 约定、API 列表） |
| OpenAPI  | `/api/v1/openapi.json` | OpenAPI 3.0 规范（请求/响应 schema、错误码枚举）     |

> **注意：** AI Agent 不会自动发现这两个文件。调用 Agent 时需提示它先读取 `/llms.txt` 了解站点结构。

---

## 发版说明

详细发版指南文档见 [docs/release-tips.md](docs/release-tips.md)。

## Supabase 生产环境配置

部署到生产域名后，需要在 Supabase Dashboard 中更新回调地址：

1. 进入项目 → **Authentication** → **URL Configuration**
2. 将 **Site URL** 改为你的生产域名（如 `https://yourdomain.com`）
3. 在 **Redirect URLs** 中添加：`https://yourdomain.com/api/auth/callback`

这样邮箱验证、密码重置等功能才能正常工作。
