#!/bin/bash
# 生产环境部署脚本
# 停服 → 安装依赖 → 构建 → 启动新版本 → 健康检查
set -euo pipefail

PROJECT_DIR="/home/ewing/craft/vibe_blog_next"
SITE_URL="https://blog.ewing.top"
PM2_NAME="vibe_blog_next"

echo "=== 开始部署 ==="

# =========================
# 1. 进入目录
# =========================
cd "$PROJECT_DIR"
echo "进入项目目录: $PROJECT_DIR"

# 手动部署时候先拉取项目，自动部署时候webhook-server.js里也会先拉取代码
git fetch origin
git reset --hard origin/main

# =========================
# 2. 安装依赖（仅 package-lock.json 有变更时才重装）
# =========================
LOCK_HASH_FILE="node_modules/.package-lock-hash"
CURRENT_HASH=$(sha256sum package-lock.json | cut -d' ' -f1)

if [ -f "$LOCK_HASH_FILE" ] && [ "$(cat "$LOCK_HASH_FILE")" = "$CURRENT_HASH" ]; then
  echo "依赖无变更，跳过 npm ci"
else
  echo "安装依赖..."
  rm -rf node_modules
  npm ci --no-audit --no-fund --prefer-offline
  echo "$CURRENT_HASH" > "$LOCK_HASH_FILE"
fi

# =========================
# 3. 构建（先停服释放端口，避免资源竞争）
# =========================
echo "停服..."
pm2 stop "$PM2_NAME" 2>/dev/null || true

echo "启动维护页面..."
node scripts/maintenance-server.js &
MAINT_PID=$!
# 脚本异常退出时清理维护进程，防止端口残留
trap 'kill $MAINT_PID 2>/dev/null' EXIT

echo "构建项目..."
# 注入构建时信息（NEXT_PUBLIC_ 变量会被 Next.js 内联到客户端代码）
export NEXT_PUBLIC_BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
export NEXT_PUBLIC_BUILD_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
export NEXT_PUBLIC_BUILD_COMMIT_COUNT=$(git rev-list --count HEAD 2>/dev/null || echo "0")
export NEXT_PUBLIC_BUILD_CONTRIBUTORS=$(git log --format='%an' 2>/dev/null | sort -u | tr '\n' ',' | sed 's/,$//' || echo "")
export NEXT_PUBLIC_BUILD_VERSION=$(node -e "console.log(require('./package.json').version)" 2>/dev/null || echo "0.0.0")
# 清理旧构建缓存，防止构建产物残留问题
rm -rf .next

npm run build
# standalone 模式需要手动复制 public 和 static 资源
mkdir -p .next/standalone/public .next/standalone/.next/static
cp -r public/. .next/standalone/public/
cp -r .next/static/. .next/standalone/.next/static/
# =========================
# 5. PM2 处理 — 先关维护页，再启动新版本
# =========================
echo "关闭维护页面..."
kill $MAINT_PID 2>/dev/null || true
wait $MAINT_PID 2>/dev/null || true
trap - EXIT

echo "启动新版本..."
pm2 start scripts/ecosystem.config.js --only vibe_blog_next

# 保存 PM2 状态（防重启丢失）
pm2 save

# 配置 @reboot crontab 实现开机自启（无需 systemd）
if ! crontab -l 2>/dev/null | grep -q 'pm2 resurrect'; then
  echo "配置 crontab 开机自启..."
  (crontab -l 2>/dev/null; echo '@reboot cd /home/ewing/craft/vibe_blog_next && pm2 resurrect') | crontab -
  echo "  ✓ crontab 开机自启已配置"
fi

# =========================
# 6. 健康检查（直接检查本地端口，不经过 nginx）
# =========================
echo "健康检查..."
sleep 5

check_url() {
  local url=$1
  local name=$2
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10 "$url" || echo "000")
  if [[ "$code" != "200" ]]; then
    echo "❌ $name 异常 (HTTP $code)"
    pm2 logs "$PM2_NAME" --lines 20
    exit 1
  fi
  echo "  ✓ $name (HTTP $code)"
}

check_url "http://127.0.0.1:8083" "本地服务"

echo "=== 部署完成 ==="
