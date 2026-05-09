# Supabase 官方服务 → 自部署迁移指南

## 前提条件

- 已安装 **Docker** + **Docker Compose v2**
- 已安装 **Supabase CLI**（用于数据迁移，可选）
- 服务器内存建议：
  - **完整部署**：4GB+
  - **最小部署**（仅 GoTrue + PostgREST + Storage，复用已有 PG）：2GB 可用

## 组件依赖分析

Supabase 由多个独立微服务组成，并非全部必需：

| 组件                  | 用途                                   | 本项目是否必需 | 内存占用 |
| --------------------- | -------------------------------------- | :------------: | -------- |
| **PostgreSQL**        | 数据库                                 |    ✅ 必需     | ~256MB   |
| **GoTrue** (auth)     | 认证登录/注册/JWT 签发                 |    ✅ 必需     | ~64MB    |
| **PostgREST** (rest)  | REST API，supabase-js 底层依赖         |    ✅ 必需     | ~64MB    |
| **Storage** (storage) | 文件上传存储                           |    ✅ 必需     | ~64MB    |
| **Studio**            | Web 管理界面（表管理/用户/SQL Editor） |    ✅ 需要     | ~128MB   |
| **Kong**              | API 网关，路由转发                     |   ❌ 可跳过    | ~100MB   |
| **Realtime**          | WebSocket 实时推送                     |   ❌ 未使用    | ~128MB   |
| **Supavisor**         | 数据库连接池                           |   ❌ 不需要    | ~64MB    |
| **Logflare**          | 日志分析                               |   ❌ 不需要    | ~128MB   |
| **imgproxy**          | 图片缩放处理                           |   ❌ 不需要    | ~32MB    |

> 本项目不使用 `realtime` 频道、不依赖 Supavisor 连接池。**最小部署需 GoTrue + PostgREST + Storage + Studio 四个服务**，额外内存 ~350MB，加已有 PG 约 600-650MB 总占用。

---

## 一、部署方案选择

### 方案 A：复用已有 PostgreSQL（推荐，2GB 内存适用）

如果你已部署了 PostgreSQL，只需额外启动 4 个容器（GoTrue + PostgREST + Storage + Studio），共用已有数据库。

### 方案 B：完整 Docker Compose（4GB+ 内存适用）

跟官方仓库整体部署。见下方"完整部署"章节。

---

## 二、方案 A：最小化部署（复用已有 PG）

### 2.1 准备 JWT 密钥

```bash
# 生成 JWT Secret（至少 32 字符）
openssl rand -base64 48
```

记下生成的 JWT Secret，后续多处要用。

### 2.2 在你的 PostgreSQL 中创建 Supabase 所需的 Schema

连接已有 PostgreSQL 执行：

```sql
-- 创建 Supabase 扩展和 schema
create extension if not exists "pgcrypto";
create extension if not exists "pgjwt";
create schema if not exists auth;
create schema if not exists storage;
create schema if not exists supabase_migrations;

-- 创建 auth 角色（GoTrue 使用）
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
grant anon, authenticated, service_role to postgres;
```

### 2.3 编写最小 docker-compose.yml

```yaml
# docker-compose.yml — 最小化 Supabase（2GB 内存适用）
version: '3.8'

services:
  # ── GoTrue: 认证服务 ──
  gotrue:
    image: supabase/gotrue:v2.164.0
    restart: unless-stopped
    environment:
      GOTRUE_API_HOST: 0.0.0.0
      GOTRUE_API_PORT: 9999
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: postgres://postgres:${PG_PASSWORD}@${PG_HOST}:5432/postgres
      GOTRUE_SITE_URL: ${SITE_URL}
      GOTRUE_JWT_SECRET: ${JWT_SECRET}
      GOTRUE_JWT_EXP: 3600
      GOTRUE_JWT_DEFAULT_GROUP_NAME: authenticated
      GOTRUE_EXTERNAL_GITHUB_ENABLED: '${GITHUB_ENABLED:-false}'
      GOTRUE_EXTERNAL_GITHUB_CLIENT_ID: ${GITHUB_CLIENT_ID:-}
      GOTRUE_EXTERNAL_GITHUB_SECRET: ${GITHUB_CLIENT_SECRET:-}
      GOTRUE_EXTERNAL_GITHUB_REDIRECT_URI: ${SITE_URL}/api/auth/callback
      GOTRUE_DISABLE_SIGNUP: 'false'
      GOTRUE_MAILER_AUTOCONFIRM: '${MAILER_AUTOCONFIRM:-true}'
    ports:
      - '9999:9999'

  # ── PostgREST: REST API ──
  postgrest:
    image: postgrest/postgrest:v12.2.3
    restart: unless-stopped
    environment:
      PGRST_DB_URI: postgres://postgres:${PG_PASSWORD}@${PG_HOST}:5432/postgres
      PGRST_DB_SCHEMAS: public,auth,storage
      PGRST_DB_ANON_ROLE: anon
      PGRST_JWT_SECRET: ${JWT_SECRET}
      PGRST_DB_USE_LEGACY_GUCS: 'false'
    ports:
      - '3001:3000'

  # ── Storage: 文件存储（封面图/头像） ──
  storage:
    image: supabase/storage-api:v1.15.0
    restart: unless-stopped
    environment:
      ANON_KEY: ${ANON_KEY}
      SERVICE_KEY: ${SERVICE_ROLE_KEY}
      DATABASE_URL: postgres://postgres:${PG_PASSWORD}@${PG_HOST}:5432/postgres
      TENANT_ID: stub
      REGION: local
      GLOBAL_S3_BUCKET: supa-storage
      PGRST_JWT_SECRET: ${JWT_SECRET}
      FILE_SIZE_LIMIT: 20971520
      STORAGE_BACKEND: file
      FILE_STORAGE_BACKEND_PATH: /var/lib/storage
    volumes:
      - storage_data:/var/lib/storage
    ports:
      - '5000:5000'

  # ── Studio: Web 管理界面 ──
  studio:
    image: supabase/studio:2025.02.10
    restart: unless-stopped
    environment:
      SUPABASE_URL: http://localhost:8000
      SUPABASE_PUBLIC_URL: http://localhost:8000
      SUPABASE_ANON_KEY: ${ANON_KEY}
      SUPABASE_SERVICE_KEY: ${SERVICE_ROLE_KEY}
      IS_PLATFORM: 'false'
      DEFAULT_PROJECT: default
      LOGIN_MESSAGE: 'Vibe Blog 管理后台'
    ports:
      - '8001:3000'

  # ── 轻量 API 网关（Kong 替代，~10MB） ──
  nginx:
    image: nginx:alpine
    restart: unless-stopped
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    ports:
      - '8000:8000'
    depends_on:
      - gotrue
      - postgrest
      - storage
      - studio

volumes:
  storage_data:
```

### 2.4 nginx 路由配置

```nginx
# nginx.conf — 把所有服务聚合到单一端口 8000
events { worker_connections 1024; }

http {
  server {
    listen 8000;

    # Auth
    location /auth/v1/ {
      proxy_pass http://gotrue:9999/auth/v1/;
      proxy_set_header Host $host;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # REST API
    location /rest/v1/ {
      proxy_pass http://postgrest:3000/;
      proxy_set_header Host $host;
    }

    # Storage
    location /storage/v1/ {
      proxy_pass http://storage:5000/storage/v1/;
      proxy_set_header Host $host;
    }
  }
}
```

### 2.5 .env 文件

```env
# Postgres
PG_HOST=172.17.0.1           # Docker host IP（如果 PG 在宿主机）或容器名
PG_PASSWORD=your_pg_password

# JWT
JWT_SECRET=your_jwt_secret_base64

# API Key（用 JWT Secret 在 jwt.io 签发，payload: { "role": "anon" }）
ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Role Key（payload: { "role": "service_role" }）
SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Site
SITE_URL=http://your-server-ip:3000

# GitHub OAuth（可选）
GITHUB_ENABLED=false
```

### 2.6 启动

```bash
docker compose up -d
docker compose ps    # 确认 gotrue / postgrest / storage / studio / nginx 都在运行
```

### 2.7 初始化数据库

连接你的 PG 执行 [supabase/init.sql](init.sql)：

```bash
psql postgres://postgres:${PG_PASSWORD}@localhost:5432/postgres < supabase/init.sql
```

### 2.8 创建 Storage Bucket

**方法 1：通过 Studio（推荐）**

浏览器打开 `http://your-server-ip:8001` → **Storage** → 创建两个新 bucket，均设为公开（public）：

| Bucket    | 公开访问 | 文件大小限制 |
| --------- | -------- | ------------ |
| `avatars` | ✅ 是    | 20MB         |
| `covers`  | ✅ 是    | 20MB         |

**方法 2：通过 API**

```bash
curl -X POST http://localhost:5000/storage/v1/bucket \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"name":"avatars","public":true,"file_size_limit":20971520}'

curl -X POST http://localhost:5000/storage/v1/bucket \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"name":"covers","public":true,"file_size_limit":20971520}'
```

### 2.9 验证服务

- **API 端点**：`curl http://localhost:8000/rest/v1/`（应返回 JSON）
- **Studio**：浏览器打开 `http://your-server-ip:8001`
- **Auth**：进入 Studio → Authentication → Users，确认可以手动创建用户
- **GitHub OAuth**：如需配置，进入 Studio → Authentication → Providers → GitHub

---

## 三、方案 B：完整 Docker Compose 部署（4GB+ 内存适用）

### 3.1 克隆官方 Docker 项目

```bash
git clone --depth 1 https://github.com/supabase/supabase.git
cd supabase/docker
cp .env.example .env
```

### 3.2 精简官方 docker-compose.yml

编辑 `docker-compose.yml`，注释或删除不需要的服务：

```yaml
# 可删除的服务（本项目未使用）：
# - realtime     （WebSocket 推送）
# - supavisor    （连接池）
# - imgproxy     （图片处理）
# - logflare     （日志）
# - vector       （日志采集）
```

### 3.3 修改 `.env` 关键配置

```env
POSTGRES_PASSWORD=your_strong_password_here
JWT_SECRET=your_jwt_secret_at_least_32_chars
ANON_KEY=your_anon_key
SERVICE_ROLE_KEY=your_service_role_key
SITE_URL=http://your-server-ip:3000
API_EXTERNAL_URL=http://your-server-ip:8000
STUDIO_PORT=8001
```

> **JWT Secret 生成**：`openssl rand -base64 48`

### 3.4 启动

```bash
docker compose up -d
docker compose ps
```

---

---

## 二、初始化数据库

### 2.1 打开 Studio

浏览器访问 `http://your-server-ip:8000/studio`，用 Admin API 密钥登录，然后进入 **SQL Editor**。

### 2.2 执行 init.sql

将项目中的 [supabase/init.sql](init.sql) 完整内容粘贴到 SQL Editor 并执行。

这会创建：

- 所有表（posts, post_likes, post_comments, tags, etc.）
- 触发器（updated_at 自动更新、注册自动创建 user_settings）
- RLS 行级安全策略

---

## 三、配置 Storage

### 3.1 创建 Bucket

在 Studio 中进入 **Storage**，创建两个公开 bucket：

| Bucket 名称 | 公开访问 | 用途     |
| ----------- | -------- | -------- |
| `avatars`   | ✅ 是    | 用户头像 |
| `covers`    | ✅ 是    | 文章封面 |

### 3.2 配置 CORS（如需要）

如果前端部署在不同域名，在 Storage 设置中添加 CORS 规则。

---

## 四、配置 Auth

### 4.1 关闭邮箱确认（本地/测试环境）

Studio → Authentication → Settings：

- **Enable email confirmations**：关闭（可选）

### 4.2 配置 GitHub OAuth

Studio → Authentication → Providers → GitHub：

1. 在 GitHub 创建 OAuth App（Settings → Developer settings → OAuth Apps）
2. 填入 Client ID 和 Client Secret
3. Callback URL 设为：`http://your-server-ip:3000/api/auth/callback`

### 4.3 配置 SMTP（可选，用于密码重置邮件）

Studio → Authentication → Settings → SMTP Settings。

---

## 五、修改项目环境变量

编辑 `.env.local`（或部署时的环境变量）：

```env
# 改为自部署实例的地址（注意不要漏掉 /storage/v1 这些路径，直接用根 URL）
NEXT_PUBLIC_SUPABASE_URL=http://your-server-ip:8000
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_anon_key_from_step_1.2
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_from_step_1.2
```

> **注意**：`NEXT_PUBLIC_SUPABASE_URL` 填 API 端点（默认 8000），不是 Studio（默认 8001）。

### 5.1 验证连接

```bash
npm run build && npm run start
```

打开首页，确认数据能正常加载（此时数据库为空，应看到"暂无文章"等空状态）。

---

## 六、迁移现有数据（从官方服务导入）

### 6.1 通过 Supabase Dashboard 导出

**Supabase 官方 Dashboard → Database → 导出**：

下载完整的数据备份，然后通过 `psql` 导入到自部署数据库：

```bash
# 导出
pg_dump postgres://postgres:[PASSWORD]@[YOUR_PROJECT_REF].supabase.co:5432/postgres > backup.sql

# 导入（注意先确保 init.sql 的表已存在）
psql postgres://postgres:your_postgres_password@your-server-ip:5432/postgres < backup.sql
```

或者使用 Supabase CLI：

```bash
# 连接官方项目
supabase link --project-ref YOUR_PROJECT_REF

# 导出数据
supabase db dump --local > data.sql

# 导入到自部署
psql postgres://postgres:your_password@your-server-ip:5432/postgres < data.sql
```

### 6.2 迁移 Storage 文件

头像和封面的文件需要手动迁移（Storage 文件不包含在数据库导出中）：

```bash
# 1. 从官方 Storage 下载所有文件
# 在 Supabase Dashboard → Storage → 逐个文件下载
# 或使用 Supabase API 批量下载

# 2. 上传到自部署 Storage
# 在自部署 Studio → Storage → 上传文件
# 或使用 Supabase API 批量上传
```

如果用户量和文章量不大，可以让用户重新上传头像，文章重新设置封面。

---

## 七、生产环境加固（部署到公网前必须执行）

### 7.1 使用 HTTPS

通过 Nginx/Caddy 反向代理，为 API 端点配置 SSL 证书：

```nginx
# 示例 Nginx 配置
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

### 7.2 开启邮箱确认

Studio → Authentication → Settings → **Enable email confirmations**。

### 7.3 修改默认密钥

生产环境必须更换所有部署时的默认密钥（`POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`）。

### 7.4 定期备份

```bash
# 每日备份脚本（加入 crontab）
pg_dump postgres://postgres:password@localhost:5432/postgres \
  > /backups/supabase_$(date +%Y%m%d).sql

# 保留最近 7 天
find /backups -name 'supabase_*.sql' -mtime +7 -delete
```

### 7.5 防火墙配置

只开放必要端口：

- 80/443（Nginx/Caddy）
- 22（SSH，限 IP）
- 5432（Postgres，仅本地 127.0.0.1）

Supabase 内部端口（8000, 8001, 等）只监听 `127.0.0.1`。

---

## 变更清单速查

| 序号 | 事项                     | 操作类型   | 预估时间 |
| ---- | ------------------------ | ---------- | -------- |
| 1    | 部署 Supabase Docker     | 服务器操作 | 30 分钟  |
| 2    | 执行 init.sql            | SQL Editor | 2 分钟   |
| 3    | 创建 Storage bucket      | Studio UI  | 2 分钟   |
| 4    | 配置 GitHub OAuth        | Studio UI  | 10 分钟  |
| 5    | 修改项目环境变量         | 代码/部署  | 1 分钟   |
| 6    | 迁移数据库数据           | CLI/psql   | 10 分钟  |
| 7    | 迁移 Storage 文件        | 手动       | 视情况   |
| 8    | 生产环境加固（HTTPS 等） | 服务器操作 | 30 分钟  |

> **代码层面无需任何修改**，所有 Supabase 客户端通过环境变量 `NEXT_PUBLIC_SUPABASE_URL` 连接，指向自部署实例后自动生效。
