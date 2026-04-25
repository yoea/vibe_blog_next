# Blog

基于 Next.js 16 + Supabase 的个人博客系统。

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

复制 `.env.local.example` 为 `.env.local` 并填入你的 Supabase 配置：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
NEXT_PUBLIC_SITE_TITLE=你的网站标题
```

> Supabase 密钥在项目 Dashboard → **Settings → API** 页面获取。
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

```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
NEXT_PUBLIC_SITE_TITLE=你的网站标题
EOF
```

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

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 6: 启用 HTTPS（可选）

```bash
sudo certbot --nginx -d yourdomain.com
```

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

也可以通过 `ecosystem.config.js` 管理环境变量：

```js
module.exports = {
  apps: [{
    name: 'vibe-blog',
    script: 'npm',
    args: 'start -- -p 8083',
    env: {
      NODE_ENV: 'production',
      PORT: '8083',
      NEXT_PUBLIC_SUPABASE_URL: 'https://your-project.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'your_publishable_key',
      NEXT_PUBLIC_SITE_TITLE: '你的网站标题',
    }
  }]
}
```

然后启动：`pm2 start ecosystem.config.js`

---

## Supabase 生产环境配置

部署到生产域名后，需要在 Supabase Dashboard 中更新回调地址：

1. 进入项目 → **Authentication** → **URL Configuration**
2. 将 **Site URL** 改为你的生产域名（如 `https://yourdomain.com`）
3. 在 **Redirect URLs** 中添加：`https://yourdomain.com/auth/callback`

这样邮箱验证、密码重置等功能才能正常工作。

## 生产环境需变更的配置清单

| 配置项 | 说明 |
|--------|------|
| `.env.local` | 在服务器手动创建，填入 Supabase 连接信息 |
| 监听端口 | `package.json` 中 `start` 脚本加 `-p 端口号`，或 `PORT=8083 npm start` |
| Supabase Site URL | 从 `http://localhost:3000` 改为生产域名 |
| Supabase Redirect URLs | 添加 `https://yourdomain.com/auth/callback` |
| Nginx `server_name` | 改为你的生产域名 |
