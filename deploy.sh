#!/bin/bash
set -e

PROJECT_DIR="/home/ewing/craft/vibe_blog_demo"
SITE_URL="https://blog.ewing.top"
PM2_NAME="vibe-blog"

echo "=== 开始部署 ==="

# 1. 进入项目目录
cd "$PROJECT_DIR"
echo "进入项目目录: $PROJECT_DIR"

# 2. 拉取代码（遇到本地变更则 stash）
echo "拉取最新代码..."
git stash --include-untracked || true
git pull --rebase || git pull
echo "代码拉取完成"

# 3. 安装依赖
echo "安装依赖..."
npm install

# 4. 构建
echo "构建项目..."
npm run build

# 5. 重启服务
echo "重启 PM2 服务: $PM2_NAME"
pm2 restart "$PM2_NAME"

# 6. 健康检查
echo "健康检查: $SITE_URL"
sleep 5
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$SITE_URL")

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 301 ] || [ "$HTTP_CODE" -eq 302 ]; then
  echo "页面访问正常 (HTTP $HTTP_CODE)"
else
  echo "⚠ 页面返回异常 (HTTP $HTTP_CODE)，请检查！"
  exit 1
fi

echo "=== 部署完成 ==="
