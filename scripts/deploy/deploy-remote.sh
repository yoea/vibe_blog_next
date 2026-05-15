#!/bin/bash
# 服务端部署脚本（由 deploy-local.mjs 通过 ssh 触发）
# 接收上传的构建产物 → 校验 → 替换 → 启动
set -euo pipefail

# ANSI 颜色
C_RESET='\033[0m'; C_GREEN='\033[32m'; C_RED='\033[31m'; C_YELLOW='\033[33m'; C_CYAN='\033[36m'
ok()   { echo -e "${C_GREEN}$*${C_RESET}"; }
err()  { echo -e "${C_RED}$*${C_RESET}"; }
warn() { echo -e "${C_YELLOW}$*${C_RESET}"; }

# =========================
# 配置
# =========================
# 从脚本位置推导项目根目录（scripts/deploy/ 的上两级）
PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
ARTIFACT_PATH="/tmp/deploy-artifact.tar.gz"
LOCK_FILE="/tmp/deploy-vibe.lock"
PM2_NAME="vibe_blog_next"

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
ok "✓ 获取部署锁成功"

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
ok "✓ 构建产物校验通过"

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

DEPLOY_COMMIT=$(sed -n 's/^build_commit=//p' "$DEPLOY_TMP/.deploy-meta" 2>/dev/null | tr -d '[:space:]')
ok "✓ 解压完成 (commit: $DEPLOY_COMMIT)"

# =========================
# 4. 原子替换（旧应用仍在运行，文件在内存中，替换安全）
# =========================
rm -rf "$PROJECT_DIR/.next/standalone.old"
if [ -d "$PROJECT_DIR/.next/standalone" ]; then
  mv "$PROJECT_DIR/.next/standalone" "$PROJECT_DIR/.next/standalone.old"
fi
mkdir -p "$PROJECT_DIR/.next"
mv "$DEPLOY_TMP" "$PROJECT_DIR/.next/standalone"
ok "✓ 文件替换完成"

# =========================
# 5. 重启应用
# =========================
cd "$PROJECT_DIR"
if [ -f .env.local ]; then
  set -a
  source .env.local
  set +a
fi
if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 delete "$PM2_NAME" 2>/dev/null || true
  echo "删除并重建旧的 $PM2_NAME 服务"
fi
pm2 start "$PROJECT_DIR/scripts/server/ecosystem.config.js" --only "$PM2_NAME"
pm2 save
ok "✓ $PM2_NAME 服务重建成功，新版本已启动"

# 重建 webhook 服务（确保脚本变更加载）
if pm2 describe webhook >/dev/null 2>&1; then
  pm2 delete webhook 2>/dev/null || true
  echo "删除并重建旧的 webhook 服务"
fi
pm2 start "$PROJECT_DIR/scripts/server/ecosystem.config.js" --only webhook
pm2 save
ok "✓ webhook 服务已重建"

# =========================
# 6. 清理旧版本
# =========================
rm -rf "$PROJECT_DIR/.next/standalone.old"
ok "✓ 服务器上的旧版本部署文件已清理"

# =========================
# 7. 部署报告
# =========================
if [ -f "$PROJECT_DIR/.next/standalone/.deploy-meta" ]; then
  echo ""
  echo "--- 构建信息 ---"
  cat "$PROJECT_DIR/.next/standalone/.deploy-meta"
  echo ""
  echo "----------------"
fi

echo -e "${C_CYAN}=== 服务器端部署完成 $(date '+%Y-%m-%d %H:%M:%S') ===${C_RESET}"
