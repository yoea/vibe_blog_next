#!/bin/bash
# 全新服务器部署脚本 for vibe_blog_next
# 用法: bash deploy-blog-new.sh [端口号，默认8083]
#
# 流程: 安装依赖 → 克隆代码 → npm install → 配置 .env.local → 构建 → PM2 启动 → 健康检查

set -euo pipefail

# =========================
# 配置
# =========================
GITHUB_REPO="https://github.com/yoea/vibe_blog_next"
PROJECT_DIR="$HOME/vibe_blog_next"
DEFAULT_PORT=8083
PORT=${1:-$DEFAULT_PORT}
export PORT

PUBLIC_IP=$(curl -s --connect-timeout 5 https://api.ipify.org || curl -s --connect-timeout 5 https://ipv4.icanhazip.com || echo "localhost")

echo "=== 服务器完整部署脚本 ==="
echo "GitHub仓库: $GITHUB_REPO"
echo "项目目录: $PROJECT_DIR"
echo "端口: $PORT"
echo "公网IP: $PUBLIC_IP"
echo ""

# =========================
# 1. 安装系统依赖
# =========================
echo "[1/6] 检查并安装系统依赖..."

sudo apt update -y

if ! command -v git &> /dev/null; then
    echo "  安装 Git..."
    sudo apt install -y git
else
    echo "  Git 已安装"
fi

if ! command -v node &> /dev/null || [[ $(node --version | cut -d'.' -f1 | sed 's/v//') -lt 18 ]]; then
    echo "  安装 Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "  Node.js 已安装 ($(node --version))"
fi

if ! command -v pm2 &> /dev/null; then
    echo "  安装 PM2..."
    sudo npm install -g pm2
else
    echo "  PM2 已安装"
fi

echo "✓ 系统依赖就绪"
echo ""

# =========================
# 2. 克隆或更新代码
# =========================
echo "[2/6] 准备代码..."

if [ -d "$PROJECT_DIR/.git" ]; then
    echo "  项目已存在，拉取最新代码..."
    cd "$PROJECT_DIR"
    git pull origin main
else
    echo "  克隆仓库..."
    rm -rf "$PROJECT_DIR"
    git clone "$GITHUB_REPO" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

echo "✓ 代码就绪"
echo ""

# =========================
# 3. 安装项目依赖
# =========================
echo "[3/6] 安装项目依赖..."
npm install
echo "✓ 依赖安装完成"
echo ""

# =========================
# 4. 配置环境变量
# =========================
echo "[4/6] 配置环境变量..."

ENV_FILE=".env.local"
if [ ! -f "$ENV_FILE" ]; then
    echo "  首次部署，需要填写配置："
    echo ""

    read -p "  Supabase URL: " SUPABASE_URL
    read -p "  Supabase 公开密钥 (anon key): " SUPABASE_KEY
    read -s -p "  Supabase 服务角色密钥 (service role key): " SERVICE_ROLE_KEY
    echo ""
    read -p "  站点标题 (默认: Vibe Blog): " SITE_TITLE
    SITE_TITLE=${SITE_TITLE:-"Vibe Blog"}
    read -p "  站点 URL (默认: http://$PUBLIC_IP:$PORT): " SITE_URL
    SITE_URL=${SITE_URL:-"http://$PUBLIC_IP:$PORT"}
    read -p "  站点描述 (默认: 一个简洁的博客): " SITE_DESC
    SITE_DESC=${SITE_DESC:-"一个简洁的博客"}
    read -p "  Webhook 密钥 (留空则不验证签名): " WEBHOOK_SECRET

    cat > "$ENV_FILE" << EOF
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$SUPABASE_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_TITLE=$SITE_TITLE
# 副标题由管理员在个人中心设置，不再通过环境变量配置
PORT=$PORT
SERVER_DIR=$PROJECT_DIR
${WEBHOOK_SECRET:+WEBHOOK_SECRET=$WEBHOOK_SECRET}
WEBHOOK_AUTO_BUILD=true
EOF

    echo "✓ .env.local 已创建"
else
    echo "  .env.local 已存在，跳过"
    SITE_URL="http://$PUBLIC_IP:$PORT"
fi

echo ""

# =========================
# 5. 构建项目
# =========================
echo "[5/6] 构建项目..."
npm run build
echo "✓ 构建完成"
echo ""

# =========================
# 6. 启动服务
# =========================
echo "[6/6] 启动服务..."

# 停止旧进程（忽略不存在的错误）
pm2 delete vibe_blog_next 2>/dev/null || true
pm2 delete webhook 2>/dev/null || true

# 启动主应用
pm2 start scripts/server/ecosystem.config.js --only vibe_blog_next

# 启动 webhook（如果存在）
if [ -f "scripts/server/webhook-server.js" ]; then
    pm2 start scripts/server/ecosystem.config.js --only webhook
fi

pm2 save

# 配置开机自启
pm2 startup 2>/dev/null || true

echo "✓ 服务已启动"
echo ""

# =========================
# 健康检查
# =========================
echo "健康检查中：访问 http://localhost:$PORT/api/healthz ..."
HEALTH_URL="http://localhost:$PORT/api/healthz"
MAX_RETRIES=10
DELAY=3

for i in $(seq 1 $MAX_RETRIES); do
    if curl -s --connect-timeout 3 --max-time 5 "$HEALTH_URL" | grep -q '"status":"ok"'; then
        echo "✓ 健康检查通过"
        echo ""
        echo "=============================="
        echo "  部署完成！"
        echo "  站点: $SITE_URL"
        echo "  端口: $PORT"
        echo ""
        echo "  常用命令:"
        echo "    pm2 logs                # 查看日志"
        echo "    pm2 restart vibe_blog_next  # 重启"
        echo "    pm2 stop vibe_blog_next     # 停止"
        echo ""
        echo "  Git Push 自动部署（可选）:"
        echo "    1. 开放防火墙: sudo ufw allow 8084/tcp"
        echo "    2. 在 GitHub/Gitee 仓库 Settings → Webhooks 添加:"
        echo "       URL: http://$PUBLIC_IP:8084/"
        echo "       Content type: application/json"
        ${WEBHOOK_SECRET:+echo "       Secret: $WEBHOOK_SECRET"}
        echo "       事件: Just the push event"
        echo "    配置后 git push 到 main 分支会自动拉取代码并重新构建"
        echo "=============================="
        exit 0
    fi
    echo "  [$i/$MAX_RETRIES] 等待服务启动..."
    sleep $DELAY
done

echo "❌ 健康检查失败，查看日志排查："
echo "  pm2 logs vibe_blog_next --lines 30"
pm2 logs vibe_blog_next --lines 20 --nostream
exit 1
