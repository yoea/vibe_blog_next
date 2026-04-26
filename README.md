# Blog

基于 Next.js 16 + Supabase 的个人博客系统。

## 功能特性

- 用户注册/登录/密码重置
- Markdown 文章发布与预览
- AI 一键生成文章摘要（兼容 OpenAI API）
- 文章点赞与评论（无需登录也可点赞）
- Markdown 代码块语法高亮（highlight.js，github-dark-dimmed 主题）
- 作者主页：头像首字、昵称、注册时间、文章数
- 首页站点统计（访问量 + 点赞数，IP 去重 + 频率限制）
- 作者列表页（莫兰迪色系用户标识 + 活跃/注销状态）
- 移动端响应式适配（汉堡菜单、溢出修复）
- 用户设置：昵称修改、密码重置、退出登录、账号注销
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

复制 `.env.local.example` 为 `.env.local` 并填入你的 Supabase 配置

> Supabase 密钥在项目 Dashboard → **Settings → API** 页面获取。
> `SUPABASE_SERVICE_ROLE_KEY` 用于作者列表等管理功能，仅在服务端使用。
> 监听地址和端口通过 `package.json` 的 scripts 控制（`-H 0.0.0.0`），无需额外配置。

### 3. 初始化数据库

在 Supabase Dashboard 的 **SQL Editor** 中执行 `supabase/schema.sql`，创建所有表和 RLS 策略。

### 4. 启动开发服务器

```bash
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000) 访问。

---

## 生产环境部署（Node.js 服务器）

### 前置要求

- Node.js >= 20.x（推荐 LTS）
- Nginx（反向代理 + HTTPS）
- PM2（进程守护，可选）

### Step 1: 拉取代码并安装依赖

```bash
git clone git@git.ewing.top:yoea/vibe_blog_demo.git /path/to/app
cd /path/to/app
npm install
```

### Step 2: 创建环境变量文件
复制 `.env.local.example` 为 `.env.local` 并填入你的 Supabase 配置

```bash
> `.env.local` 已在 `.gitignore` 中忽略，**不要提交到仓库**。

### Step 3: 构建生产版本

```bash
npm run build
```

### Step 4: 启动服务

```bash
npm start
```

默认监听 `http://0.0.0.0:3000`。如需修改端口：

```bash
# 方式一：命令行参数（推荐）
PORT=8083 npm start

# 方式二：修改 package.json 中 start 脚本，添加 -p 参数
"start": "next start -H 0.0.0.0 -p 8083"
```

### Step 5: 配置 Nginx 反向代理

### Step 6: 启用 HTTPS

### Step 7: 进程守护（PM2）

默认 `npm start` 需要终端保持运行。使用 PM2 可以让它在后台常驻、崩溃自动重启、开机自启：

```bash
# 安装 PM2
npm install -g pm2

# 启动（假设端口为 8083）
PORT=8083 pm2 start npm --name "vibe-blog" -- start -- -p 8083

# 保存当前进程列表，重启后恢复
pm2 save

# 设置开机自启
pm2 startup
```

常用命令：

```bash
pm2 status            # 查看所有进程状态
pm2 logs vibe-blog    # 查看日志
pm2 restart vibe-blog # 重启
pm2 stop vibe-blog    # 停止
pm2 delete vibe-blog  # 删除进程守护（从列表中移除）
pm2 startup           # 设置开机自启（按提示执行返回的命令）
pm2 unstartup         # 关闭开机自启
```

然后启动：`pm2 start ecosystem.config.js`

---

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

todo:
修复：
1、设置页重复获取用户 — 页面调一次 getUser()，getUserSettings() 内部又调一次
2、不存在与 user_settings 自动创建 — 注册后无 trigger 自动创建行 
3、导航图标缺 aria-label — 移动端菜单和主题切换按钮
4、logo 缺 alt 文本
5、hydration 警告 — navigator.platform 服务端/客户端不一致
6、proxy.ts 非标准命名 — Next.js 惯例是 middleware.ts 
7、未使用的 shadcn 组件 — avatar, badge, skeleton, dropdown-menu │ src/components/ui/   