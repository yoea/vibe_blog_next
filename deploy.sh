#!/bin/bash
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

# =========================
# 2. 安装依赖
# =========================
echo "安装依赖..."
npm ci --no-audit --no-fund --prefer-offline

# =========================
# 3. 构建（失败直接退出）
# =========================
echo "构建项目..."
# 注入构建时信息（NEXT_PUBLIC_ 变量会被 Next.js 内联到客户端代码）
export NEXT_PUBLIC_BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
export NEXT_PUBLIC_BUILD_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
# 清理旧构建缓存，防止构建产物残留问题
rm -rf .next

npm run build
# standalone 模式需要手动复制 public 和 static 资源
mkdir -p .next/standalone/public .next/standalone/.next/static
cp -r public/. .next/standalone/public/
cp -r .next/static/. .next/standalone/.next/static/
# =========================
# 5. PM2 处理 — 只重启主应用，不动 webhook
# =========================
echo "启动/重启主应用..."
pm2 restart "$PM2_NAME" 2>/dev/null || pm2 start ecosystem.config.js --only "$PM2_NAME"

# 保存 PM2 状态（防重启丢失）
pm2 save

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
