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
# 2. 拉代码（更安全）
# =========================
echo "拉取最新代码..."

# 如果有改动先 stash
git stash push -u -m "deploy stash" || true

# 保证不报错卡死
git fetch origin main
git reset --hard origin/main

echo "代码更新完成，检测代码变更..."

CHANGED_FILES=$(git diff --name-only HEAD@{1} HEAD || true)

echo "$CHANGED_FILES"
# =========================
# 3. 安装依赖（避免卡死）
# =========================
NEED_INSTALL=false

if echo "$CHANGED_FILES" | grep -E "package-lock.json|package.json|pnpm-lock.yaml"; then
  NEED_INSTALL=true
fi

if [ "$NEED_INSTALL" = true ]; then
  echo "依赖变化，执行 npm ci..."
  npm ci --no-audit --no-fund --prefer-offline
else
  echo "跳过 npm ci（无依赖变化）"
fi

# =========================
# 4. 构建（失败直接退出）
# =========================
echo "构建项目..."
if [ ! -f .next/BUILD_STAMP ] || find src next.config.ts -newer .next/BUILD_STAMP | grep -q .; then
  echo "需要重新构建"
  # 清理旧构建缓存，防止 Turbopack 缓存问题
  rm -rf .next
  npm run build
  # standalone 模式需要手动复制 public 和 static 资源
  mkdir -p .next/standalone/public .next/standalone/.next/static
  cp -r public/. .next/standalone/public/
  cp -r .next/static/. .next/standalone/.next/static/
  touch .next/BUILD_STAMP
else
  echo "跳过 build"
fi
# =========================
# 5. PM2 处理 — 总是删除旧进程重新创建
# =========================
echo "停止旧 PM2 服务（如有）..."
pm2 delete "$PM2_NAME" 2>/dev/null || true

echo "创建新 PM2 服务..."
pm2 start ecosystem.config.js

# 保存 PM2 状态（防重启丢失）
pm2 save

# =========================
# 6. 健康检查（带超时）
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

check_url "$SITE_URL" "首页"
check_url "${SITE_URL}/logo.svg" "静态资源 logo.svg"

echo "=== 部署完成 ==="
