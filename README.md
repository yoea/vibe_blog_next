# Blog

用Vibe Coding一个基于 Next.js 16 + Supabase 的个人博客系统。

## 功能特性

- 用户注册/登录/密码重置
- Markdown 文章发布与预览（自动保存草稿）
- AI 一键生成文章摘要（兼容 OpenAI API）
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

在 Supabase Dashboard 的 **SQL Editor** 中执行 `supabase/schema.sql`，创建所有表和 RLS 策略。

### 4. 启动开发服务器

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
Gitea Push → Webhook (8084) → git pull + deploy.sh → PM2 重启
```

### 部署步骤

```bash
# 1. 服务器拉取代码
cd /home/ewing/craft/vibe_blog_next
git pull

# 2. 一键部署（构建 + PM2 重启）
bash deploy.sh
```

### 自动部署

项目已配置 Gitea Webhook 自动部署：

1. 本地 `git push` 到 Gitea
2. Gitea 发送 POST 到 `http://127.0.0.1:8084`
3. `webhook-server.js` 验证签名后执行 `git pull && bash deploy.sh`
4. PM2 自动重启应用

### PM2 管理

```bash
pm2 list                           # 查看所有进程
pm2 logs webhook                   # 查看部署日志
pm2 logs vibe_blog_next            # 查看应用日志
pm2 restart ecosystem.config.js    # 重启所有进程
```

## 缓存策略

为缓解 Supabase Free Tier 的冷启动延迟，项目已配置 ISR（增量静态再生成）缓存：

| 页面 | 缓存时间 | 说明 |
|------|----------|------|
| 首页 `/` | 5 分钟 | `revalidate = 300` |
| 文章详情页 `/posts/[slug]` | 5 分钟 | `revalidate = 300` |
| 其他页面 | 无缓存 | 实时数据（管理页、编辑器、设置页等） |

- 缓存期内刷新页面直接返回缓存的 HTML，**不查询 Supabase**
- 发布/编辑/删除文章后，`revalidatePath` 会自动清除相关缓存
- 点赞/评论等交互通过 Server Actions + 乐观 UI 处理，不受服务端缓存影响
- 如需调整缓存时间，修改对应页面文件中的 `revalidate` 值即可

---

## Supabase 生产环境配置

部署到生产域名后，需要在 Supabase Dashboard 中更新回调地址：

1. 进入项目 → **Authentication** → **URL Configuration**
2. 将 **Site URL** 改为你的生产域名（如 `https://yourdomain.com`）
3. 在 **Redirect URLs** 中添加：`https://yourdomain.com/api/auth/callback`

这样邮箱验证、密码重置等功能才能正常工作。

---

## TODO
- [ ] 文章搜索功能
- [ ] 文章标签/分类功能
- [ ] 文章封面图上传
- [ ] 文章内容 AI 翻译
- [ ] 文章置顶功能