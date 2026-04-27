#!/bin/bash
set -euo pipefail

PROJECT_DIR="/home/ewing/craft/vibe_blog_next"
SITE_URL="https://blog.ewing.top"
PM2_NAME="vibe_blog_next"
ENTRY_FILE=".next/standalone/server.js"  # 你可以按实际改

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
if [ ! -f .next/BUILD_STAMP ] || find src app pages -newer .next/BUILD_STAMP | grep -q .; then
  echo "需要重新构建"
  # 清理旧构建缓存，防止 Turbopack 缓存问题
  rm -rf .next
  npm run build
  # standalone 模式不会自动复制 public/，需要手动复制
  cp -r public .next/standalone/public
  touch .next/BUILD_STAMP
else
  echo "跳过 build"
fi
# =========================
# 5. PM2 处理（重点优化）
# =========================
echo "检查 PM2 服务..."

if pm2 list | grep -q "$PM2_NAME"; then
  echo "PM2 已存在，重载服务..."
  pm2 reload "$PM2_NAME"
else
  echo "PM2 不存在，创建新服务..."
  pm2 start "$ENTRY_FILE" --name "$PM2_NAME" --time
fi

# 保存 PM2 状态（防重启丢失）
pm2 save

# =========================
# 6. 健康检查（带超时）
# =========================
echo "健康检查: $SITE_URL"

sleep 5

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  --connect-timeout 5 \
  --max-time 10 \
  "$SITE_URL" || echo "000")

if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "301" || "$HTTP_CODE" == "302" ]]; then
  echo "页面正常 (HTTP $HTTP_CODE)"
else
  echo "❌ 页面异常 (HTTP $HTTP_CODE)"
  echo "查看 PM2 日志："
  pm2 logs "$PM2_NAME" --lines 20
  exit 1
fi

echo "=== 部署完成 ==="
