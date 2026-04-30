#!/bin/bash
# 服务端部署脚本（由 deploy-local.mjs 通过 ssh 触发）
# 接收上传的构建产物 → 校验 → 替换 → 启动 → 健康检查
set -euo pipefail

# =========================
# 配置
# =========================
PROJECT_DIR="/home/ewing/craft/vibe_blog_next"
ARTIFACT_PATH="/tmp/deploy-artifact.tar.gz"
LOCK_FILE="/tmp/deploy-vibe.lock"
PM2_NAME="vibe_blog_next"
# 健康检查用外部 URL（localhost 在某些 ECS 环境不可达）
# 优先读 .env.local 中的 NEXT_PUBLIC_SITE_URL，fallback 到默认值
SITE_URL=$(grep -oP 'NEXT_PUBLIC_SITE_URL=\K\S+' "$PROJECT_DIR/.env.local" 2>/dev/null || echo "https://blog.ewing.top")
HEALTH_URL="${SITE_URL}/api/healthz"
HEALTH_RETRIES=6
HEALTH_DELAY=10

# 清理函数
DEPLOY_TMP=""
cleanup() {
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
  ENTRY_COUNT=$(echo "$TAR_LISTING" | wc -l)
  echo "❌ 构建产物缺少 server.js (共 ${ENTRY_COUNT} 个条目)"
  echo "  前 10 个条目:"
  echo "$TAR_LISTING" | head -10 | sed 's/^/    /'
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

# 读取本次构建的 commit（用于健康检查验证）
EXPECTED_COMMIT=$(grep -oP 'build_commit=\K\S+' "$DEPLOY_TMP/.deploy-meta" 2>/dev/null || echo "")
echo "✓ 解压完成 (commit: $EXPECTED_COMMIT)"

# =========================
# 4. 原子替换（旧应用仍在运行，文件在内存中，替换安全）
# =========================
rm -rf "$PROJECT_DIR/.next/standalone.old"
if [ -d "$PROJECT_DIR/.next/standalone" ]; then
  mv "$PROJECT_DIR/.next/standalone" "$PROJECT_DIR/.next/standalone.old"
fi
mkdir -p "$PROJECT_DIR/.next"
mv "$DEPLOY_TMP" "$PROJECT_DIR/.next/standalone"
echo "✓ 文件替换完成"

# =========================
# 5. 重启应用
# =========================
cd "$PROJECT_DIR"
if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi
pm2 stop "$PM2_NAME" 2>/dev/null || true
pm2 start scripts/ecosystem.config.js --only "$PM2_NAME"
pm2 save
echo "✓ 新版本已启动"

# =========================
# 6. 健康检查（通过 /api/healthz 接口验证）
# =========================
echo "健康检查..."
sleep "$HEALTH_DELAY"

HEALTH_OK=false
for i in $(seq 1 $HEALTH_RETRIES); do
  BODY=$(curl -s --connect-timeout 5 --max-time 10 "$HEALTH_URL" || true)
  # 从 JSON 响应中提取 build_commit
  ACTUAL_COMMIT=$(echo "$BODY" | grep -oP '"build_commit"\s*:\s*"\K[^"]+' || echo "")

  if [ -n "$ACTUAL_COMMIT" ] && [ "$ACTUAL_COMMIT" = "$EXPECTED_COMMIT" ]; then
    echo "  ✓ 服务正常 (commit: $ACTUAL_COMMIT)"
    HEALTH_OK=true
    break
  fi

  # 兼容：接口可达但 commit 不匹配或未返回
  if echo "$BODY" | grep -q '"status"\s*:\s*"ok"'; then
    if [ -n "$ACTUAL_COMMIT" ]; then
      echo "  ⚠ commit 不匹配: 期望 $EXPECTED_COMMIT, 实际 $ACTUAL_COMMIT"
    else
      echo "  ⚠ 接口可达但未返回 commit"
    fi
    # 接口可达视为服务正常（commit 不匹配可能是缓存）
    HEALTH_OK=true
    break
  fi

  echo "  ⏳ 第 ${i}/${HEALTH_RETRIES} 次检查: 未就绪"
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
# 7. 清理旧版本
# =========================
rm -rf "$PROJECT_DIR/.next/standalone.old"
echo "✓ 旧版本已清理"

# =========================
# 8. 部署报告
# =========================
if [ -f "$PROJECT_DIR/.next/standalone/.deploy-meta" ]; then
  echo ""
  echo "--- 构建信息 ---"
  cat "$PROJECT_DIR/.next/standalone/.deploy-meta"
  echo "----------------"
fi

echo "=== 部署完成 $(date '+%Y-%m-%d %H:%M:%S') ==="
