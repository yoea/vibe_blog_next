#!/bin/bash
# 服务端部署脚本（由 deploy-local.sh 通过 ssh 触发）
# 接收上传的构建产物 → 校验 → 维护页 → 替换 → 启动 → 健康检查
set -euo pipefail

# =========================
# 配置
# =========================
PROJECT_DIR="/home/ewing/craft/vibe_blog_next"
ARTIFACT_PATH="/tmp/deploy-artifact.tar.gz"
LOCK_FILE="/tmp/deploy-vibe.lock"
PM2_NAME="vibe_blog_next"
APP_PORT=$(grep -oP 'PORT:\s*\K\d+' "$PROJECT_DIR/scripts/ecosystem.config.js" || echo "8083")
HEALTH_URL="http://127.0.0.1:${APP_PORT}"
HEALTH_RETRIES=6
HEALTH_DELAY=10

# 清理函数
MAINT_PID=""
DEPLOY_TMP=""
cleanup() {
  [ -n "$MAINT_PID" ] && kill "$MAINT_PID" 2>/dev/null || true
  [ -n "$DEPLOY_TMP" ] && rm -rf "$DEPLOY_TMP"
  rm -f "$ARTIFACT_PATH"
  rm -f "$LOCK_FILE"
}

# =========================
# 1. 加锁（防止并发部署）
# =========================
exec 200>"$LOCK_FILE"
if ! flock -w 60 200; then
  echo "❌ 无法获取部署锁，可能有其他部署正在进行"
  exit 1
fi
echo "✓ 获取部署锁"

trap cleanup EXIT

# =========================
# 2. 校验产物
# =========================
if [ ! -f "$ARTIFACT_PATH" ]; then
  echo "❌ 构建产物不存在: $ARTIFACT_PATH"
  exit 1
fi

FILE_SIZE=$(stat -c%s "$ARTIFACT_PATH" 2>/dev/null || stat -f%z "$ARTIFACT_PATH" 2>/dev/null || echo "0")
if [ "$FILE_SIZE" -lt 1048576 ]; then
  echo "❌ 构建产物过小 (${FILE_SIZE} bytes)，可能上传不完整"
  exit 1
fi

TAR_LISTING=$(tar tzf "$ARTIFACT_PATH" 2>/dev/null) || {
  echo "❌ 构建产物损坏，无法解压"
  exit 1
}
if ! echo "$TAR_LISTING" | grep -q "server.js"; then
  echo "❌ 构建产物缺少 server.js"
  exit 1
fi
echo "✓ 构建产物校验通过"

# =========================
# 3. 解压到临时目录
# =========================
DEPLOY_TMP=$(mktemp -d /tmp/deploy-vibe-XXXXXX)
tar xzf "$ARTIFACT_PATH" -C "$DEPLOY_TMP"

if [ ! -f "$DEPLOY_TMP/server.js" ]; then
  echo "❌ 解压后缺少 server.js"
  rm -rf "$DEPLOY_TMP"
  exit 1
fi
echo "✓ 解压完成"

# =========================
# 4. 停止当前应用
# =========================
pm2 stop "$PM2_NAME" 2>/dev/null || true
echo "✓ 已停止当前应用"

# =========================
# 5. 启动维护页
# =========================
cd "$PROJECT_DIR"
node scripts/maintenance-server.js &
MAINT_PID=$!
echo "✓ 维护页已启动 (PID: $MAINT_PID)"

# =========================
# 6. 原子替换
# =========================
rm -rf "$PROJECT_DIR/.next/standalone.old"
mv "$PROJECT_DIR/.next/standalone" "$PROJECT_DIR/.next/standalone.old"
mv "$DEPLOY_TMP" "$PROJECT_DIR/.next/standalone"
echo "✓ 文件替换完成"

# =========================
# 7. 停维护页、启动新版本
# =========================
if [ -n "$MAINT_PID" ]; then
  kill "$MAINT_PID" 2>/dev/null || true
  MAINT_PID=""
  sleep 1
fi

cd "$PROJECT_DIR"
if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi
pm2 start scripts/ecosystem.config.js --only "$PM2_NAME"
pm2 save
echo "✓ 新版本已启动"

# =========================
# 8. 健康检查
# =========================
echo "健康检查..."
sleep "$HEALTH_DELAY"
echo "  端口检查: $(ss -tlnp 2>/dev/null | grep ":${APP_PORT} " || netstat -tlnp 2>/dev/null | grep ":${APP_PORT} " || echo "未找到监听")"

HEALTH_OK=false
for i in $(seq 1 $HEALTH_RETRIES); do
  CODE="000"
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10 "$HEALTH_URL" || true)
  if [ "$CODE" = "200" ]; then
    echo "  ✓ 服务正常 (HTTP $CODE)"
    HEALTH_OK=true
    break
  fi
  echo "  ⏳ 第 ${i}/${HEALTH_RETRIES} 次检查: HTTP $CODE"
  [ "$i" -lt "$HEALTH_RETRIES" ] && sleep "$HEALTH_DELAY"
done

if [ "$HEALTH_OK" = false ]; then
  echo "❌ 健康检查失败，回滚到旧版本..."
  if [ -d "$PROJECT_DIR/.next/standalone.old" ]; then
    rm -rf "$PROJECT_DIR/.next/standalone"
    mv "$PROJECT_DIR/.next/standalone.old" "$PROJECT_DIR/.next/standalone"
    pm2 start scripts/ecosystem.config.js --only "$PM2_NAME"
    pm2 save
    echo "  ✓ 已回滚到旧版本"
  fi
  pm2 logs "$PM2_NAME" --lines 20
  exit 1
fi

# =========================
# 9. 清理旧版本
# =========================
rm -rf "$PROJECT_DIR/.next/standalone.old"
echo "✓ 旧版本已清理"

# =========================
# 10. 部署报告
# =========================
if [ -f "$PROJECT_DIR/.next/standalone/.deploy-meta" ]; then
  echo ""
  echo "--- 构建信息 ---"
  cat "$PROJECT_DIR/.next/standalone/.deploy-meta"
  echo "----------------"
fi

echo "=== 部署完成 $(date '+%Y-%m-%d %H:%M:%S') ==="
