# 部署指南

## 目录

- [架构概览](#架构概览)
- [为什么选择本地构建上传](#为什么选择本地构建上传)
- [快速开始](#快速开始)
- [详细流程](#详细流程)
- [配置说明](#配置说明)
- [Webhook 自动同步](#webhook-自动同步)
- [服务端环境](#服务端环境)
- [故障排查](#故障排查)

---

## 架构概览

```
本地开发机 (Windows)                    服务器 (ECS 2GB Linux)
─────────────────                       ─────────────────────
npm run deploy:local
  ├─ next build (本地构建)
  ├─ tar 打包 standalone (~4.5MB)
  ├─ scp 上传 → /tmp/deploy-artifact.tar.gz
  └─ ssh 触发 deploy-remote.sh          deploy-remote.sh
                                          ├─ flock 加锁
                                          ├─ 校验 tarball
                                          ├─ 原子替换 standalone/
                                          ├─ pm2 stop + start
                                          ├─ 健康检查
                                          └─ 清理

Git Push (分支)                         webhook-server.js (8084)
  └─ Webhook POST                         └─ git pull (仅同步代码，不构建)
```

### 关键文件

| 文件 | 位置 | 说明 |
|------|------|------|
| `scripts/deploy-local.mjs` | 本地 | 本地构建 + 打包 + 上传 + 触发远端部署 |
| `scripts/deploy-remote.sh` | 服务端 | 接收产物 → 校验 → 替换 → 重启 → 健康检查 |
| `scripts/webhook-server.js` | 服务端 | 监听 GitHub/Gitee 推送，分支推送自动 git pull |
| `scripts/ecosystem.config.js` | 服务端 | PM2 进程配置 |

---

## 为什么选择本地构建上传

### 旧方案：服务端构建

```
Git Tag Push → Webhook → 服务器 git pull → npm ci → next build → PM2 重启
```

**问题：** 服务器仅 2GB 内存，`next build` 峰值内存消耗可达 1GB+。当内存不足时，操作系统大量使用 swap，导致：

- 磁盘 BPS 拉满（swap 读写）
- CPU 降至 12%（等待 I/O）
- SSH 连不上、网页打不开（系统卡死），只能通过ECS平台强制重启解决

即便添加 `NODE_OPTIONS="--max-old-space-size=768"` 限制堆内存，构建仍然非常缓慢（1分钟）且存在死机风险。

### 新方案：本地构建上传

```
本地 next build → tar 打包 → scp 上传 → 服务器仅做文件替换 + PM2 重启
```

**优势：**

| 对比项 | 旧方案（服务端构建） | 新方案（本地构建上传） |
|--------|---------------------|----------------------|
| 服务器内存压力 | 高（构建消耗 768MB+） | 无（仅文件替换） |
| 服务器停机时间 | 2-5 分钟（构建期间） | 5-10 秒（文件替换期间） |
| 上传数据量 | 无 | ~4.5MB（standalone tarball） |
| 本地环境要求 | 无 | Node.js + SSH |
| 部署可靠性 | 受服务器资源限制 | 稳定 |

**Next.js Standalone 模式** 是关键：它只打包实际使用的依赖（~25MB），而非完整的 `node_modules`（~634MB），使得上传方案完全可行。

---

## 快速开始

### 前置条件

1. **本地环境：** Node.js 18+、Git、SSH 客户端（Windows 11 自带 OpenSSH）
2. **SSH 配置：** 在 `~/.ssh/config` 中配置服务器连接信息

```
# ~/.ssh/config
Host myserver.com
    User ubuntu
    HostName myserver.com
    Port 22
    IdentityFile ~/.ssh/your_private_key
```

3. **服务器环境：** PM2 已安装、项目已 clone 到 `/home/ewing/craft/vibe_blog_next`

### 一键部署

```bash
npm run deploy:local
```

脚本会自动完成：构建 → 打包 → 上传 → 服务端替换 → 健康检查。

### 全新服务器部署

服务端脚本兼容 `.next` 目录不存在的场景（首次部署、目录被误删等）。只需：

1. 服务器 `git clone` 项目
2. 创建 `.env.local`（配置 Supabase、站点等运行时变量）
3. 本地 `npm run deploy:local`

无需手动创建 `.next` 目录，`deploy-remote.sh` 会自动处理。

### 跳过构建快速重传

如果构建成功但上传/部署环节失败（如网络中断），可跳过构建直接重传：

```bash
npm run deploy:local -- --skip-build
```

---

## 详细流程

### 本地端 (`deploy-local.mjs`)

```
Phase 1  预检
  ├─ 检查当前目录是否为项目根目录
  ├─ 测试 SSH 连接
  └─ 检查未提交的更改（警告）

Phase 2  构建
  ├─ 计算 NEXT_PUBLIC_BUILD_* 变量（时间、版本、commit、贡献者）
  ├─ 清理旧 .next 目录
  ├─ NODE_OPTIONS="--max-old-space-size=768" npx next build
  ├─ 复制 public/ 和 .next/static/ 到 .next/standalone/
  └─ 写入 .deploy-meta 构建元数据

Phase 3  打包
  └─ tar czf deploy-artifact.tar.gz -C .next/standalone .

Phase 4  上传
  └─ scp deploy-artifact.tar.gz ewing.top:/tmp/

Phase 5  远端部署
  └─ ssh ewing.top "bash .../deploy-remote.sh"（实时输出）

Phase 6  清理
  └─ 删除本地 tarball，输出耗时
```

### 服务端 (`deploy-remote.sh`)

```
Phase 1  加锁
  └─ flock /tmp/deploy-vibe.lock（防止并发部署）

Phase 2  校验产物
  ├─ 文件存在且 > 1MB
  ├─ tar 完整性检查
  └─ 包含 server.js

Phase 3  解压
  └─ 解压到 /tmp/deploy-vibe-XXXXXX/ 临时目录

Phase 4  原子替换（旧应用仍在运行，文件已加载到内存，替换安全）
  ├─ mv .next/standalone → .next/standalone.old
  └─ mv 临时目录 → .next/standalone

Phase 5  重启应用
  ├─ source .env.local（注入运行时环境变量）
  ├─ pm2 stop → pm2 start
  └─ pm2 save

Phase 6  健康检查
  ├─ curl /api/healthz（6 次重试，间隔 10s）
  ├─ 严格验证 build_commit 与本次构建一致
  └─ 失败时自动回滚并二次验证

Phase 7  清理
  ├─ 删除旧版本备份
  ├─ 删除 tarball
  └─ 释放 flock
```

---

## 配置说明

### 环境变量覆盖

部署脚本的默认配置可通过环境变量覆盖：

```bash
# 自定义 SSH Host（对应 ~/.ssh/config 中的 Host 别名）
SSH_HOST=myserver.com npm run deploy:local

# 自定义服务器项目目录
SERVER_DIR=/opt/myapp npm run deploy:local
```

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `SSH_HOST` | `ewing.top` | SSH Host 别名（对应 `~/.ssh/config`） |
| `SERVER_DIR` | `/home/ewing/craft/vibe_blog_next` | 服务器项目目录 |

SSH 端口、用户名、密钥均由 `~/.ssh/config` 管理，无需在脚本中配置。

### 修改应用端口

应用端口只需改 **2 个地方**：

| 文件 | 改什么 |
|------|--------|
| `scripts/ecosystem.config.js` | `PORT: 8083` → 改为目标端口（source of truth） |
| nginx 配置 | 反向代理指向的端口 |

其他文件自动跟随：
- `deploy-remote.sh` 从 `ecosystem.config.js` 自动读取端口

### 健康检查

部署完成后，`deploy-remote.sh` 通过访问 `/api/healthz` 接口验证新版本是否正常运行。

**原理：**

- `src/app/api/healthz/route.ts` 读取 `.deploy-meta` 文件，返回 JSON（包含 `build_commit` 等构建信息）
- `deploy-remote.sh` 用 curl 访问该接口，**严格验证**返回的 `build_commit` 与本次构建一致
- 验证通过才视为部署成功，否则自动回滚
- 回滚后会进行二次健康检查，确认旧版本恢复正常

**commit 不匹配处理：**

- 如果接口返回的 `build_commit` 与期望值不匹配，立即判定部署失败（可能是缓存或版本不一致）
- 不再盲目跳过，确保部署的版本完全正确

**为什么不用 localhost：**

部分 ECS 环境中 `curl http://127.0.0.1:8083` 不可达（iptables 或网络隔离），但通过外部域名访问正常。因此健康检查默认使用外部 URL。

**配置：**

健康检查 URL 自动从服务器 `.env.local` 中的 `NEXT_PUBLIC_SITE_URL` 读取，无需额外配置。如果读取失败，fallback 到 `https://blog.ewing.top`。

### 构建时环境变量

以下变量在本地构建时自动计算并嵌入客户端代码：

| 变量 | 来源 |
|------|------|
| `NEXT_PUBLIC_BUILD_TIME` | 当前 UTC 时间 |
| `NEXT_PUBLIC_BUILD_COMMIT` | `git rev-parse --short HEAD` |
| `NEXT_PUBLIC_BUILD_COMMIT_COUNT` | `git rev-list --count HEAD` |
| `NEXT_PUBLIC_BUILD_CONTRIBUTORS` | `git log --format='%an'` 去重 |
| `NEXT_PUBLIC_BUILD_VERSION` | `package.json` version |

### 运行时环境变量

服务端运行时变量（Supabase、AI API 等）从服务器的 `.env.local` 读取，**不在本地构建时注入**。`deploy-remote.sh` 启动 PM2 前会 `source .env.local`。

---

## Webhook 自动同步

`webhook-server.js` 运行在服务端端口 8084，监听 GitHub/Gitee 推送事件：

- **分支推送**：自动执行 `git fetch && git reset --hard origin/main`，保持服务端代码、脚本、public 资源与远程同步
- **Tag 推送**：仅记录日志，不触发部署（已改为本地构建上传）

### 推荐工作流

```bash
# 1. 本地开发、提交代码
git add . && git commit -m "feat: 新功能"

# 2. 推送到远程（webhook 自动同步服务端代码）
git push

# 3. 部署到生产环境
npm run deploy:local
```

---

## 服务端环境

### PM2 进程

| 进程 | 端口 | 说明 |
|------|------|------|
| `vibe_blog_next` | 8083 | Next.js standalone server，max 512MB 自动重启 |
| `webhook` | 8084 | Webhook 接收器，分支推送自动 git pull |

### 常用命令

```bash
# 查看进程状态
pm2 list

# 查看实时日志
pm2 logs vibe_blog_next
pm2 logs webhook

# 手动重启
pm2 restart vibe_blog_next

# 查看构建信息
cat .next/standalone/.deploy-meta
```

### 维护模式

项目有两套维护机制，各司其职：

**1. 管理员维护模式（Web UI）** — 应用仍在运行，middleware 拦截请求

- **开启**：管理员在 `/settings` 页面点击"维护模式"开关
- **效果**：所有非白名单路由被 rewrite 到 `/maintenance` 页面，Header 隐藏导航，Footer 显示"维护中"标识
- **关闭**：在维护页面点击按钮，或回 `/settings` 关闭开关
- **适用**：数据库迁移、功能调整等需要用户暂时不要操作的场景

**2. 部署维护页（自动）** — 应用已停止，独立进程接管端口

- **触发**：`npm run deploy:local` 部署流程自动使用
- **实现**：`maintenance-server.js` 在端口 8083 返回 503 维护页面（带倒计时和自动刷新）
- **生命周期**：部署脚本管理，无需手动干预
- **适用**：部署期间应用停止的几秒内，防止用户看到连接错误

### 服务器目录结构

```
/home/ewing/craft/vibe_blog_next/
├── .env.local              # 运行时环境变量（不提交到 git）
├── .next/
│   └── standalone/         # 当前运行的构建产物
│       ├── server.js       # 入口
│       ├── node_modules/   # standalone 自带的精简依赖
│       ├── .next/          # 服务端渲染产物
│       │   ├── static/     # 客户端 JS/CSS
│       │   └── server/     # 服务端页面
│       └── public/         # 静态资源
├── scripts/                # 部署脚本
├── public/                 # 源静态资源（git 同步）
└── node_modules/           # 根目录依赖（webhook 使用）
```

---

## 故障排查

### SSH 连接失败

```bash
# 测试 SSH 连接
ssh ewing.top "echo ok"

# 检查 SSH 配置
cat ~/.ssh/config

# 使用详细模式排查
ssh -v ewing.top "echo ok"
```

### 构建失败

```bash
# 本地手动构建测试
NODE_OPTIONS="--max-old-space-size=768" npm run build

# 检查 TypeScript 错误
npx tsc --noEmit

# 检查 ESLint 错误
npm run lint
```

### 上传失败

```bash
# 手动测试 scp
scp deploy-artifact.tar.gz ewing.top:/tmp/

# 检查服务器磁盘空间
ssh ewing.top "df -h /tmp"
```

### 部署失败

```bash
# 查看服务端日志
ssh ewing.top "pm2 logs vibe_blog_next --lines 30"

# 手动运行 deploy-remote.sh 查看详细错误
ssh ewing.top "bash /home/ewing/craft/vibe_blog_next/scripts/deploy-remote.sh"

# 检查是否有部署锁卡住
ssh ewing.top "ls -la /tmp/deploy-vibe.lock"
```

### 回滚

`deploy-remote.sh` 使用原子替换（`mv`），如果健康检查失败会保留旧版本。手动回滚：

```bash
ssh ewing.top
cd /home/ewing/craft/vibe_blog_next

# 如果 standalone.old 存在，可以直接回滚
mv .next/standalone .next/standalone.failed
mv .next/standalone.old .next/standalone
pm2 restart vibe_blog_next
```

### 服务器端依赖问题

standalone 模式自带精简的 `node_modules`，服务器根目录的 `node_modules` 仅 `webhook-server.js` 使用。如果该脚本的依赖变更：

```bash
ssh ewing.top
cd /home/ewing/craft/vibe_blog_next
npm ci --no-audit --no-fund
pm2 restart webhook
```
