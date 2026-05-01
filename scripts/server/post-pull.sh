#!/bin/bash
# Webhook 拉取代码后自动执行（SG测试服务器用 2026-05-01 13:04:03）
# 生产服务器通过 deploy-local.mjs + deploy-remote.sh 部署，不走此脚本
set -euo pipefail

cd "$(dirname "$0")/.."

echo "[post-pull] 安装依赖..."
npm install --production=false 2>&1 | tail -1

echo "[post-pull] 构建项目..."
npm run build 2>&1 | tail -3

echo "[post-pull] 重启服务..."
pm2 restart vibe_blog_next

echo "[post-pull] 完成"
