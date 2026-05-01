#!/bin/bash
# 完整服务器部署脚本 for vibe_blog_next
# 用法: bash deploy-server.sh [端口号，默认8080]

set -euo pipefail

# =========================
# 配置
# =========================
GITHUB_REPO="https://github.com/yoea/vibe_blog_next"
PROJECT_DIR="/home/$(whoami)/vibe_blog_next"
DEFAULT_PORT=8080
PORT=${1:-$DEFAULT_PORT}

# 获取服务器公网IP（用于默认SITE_URL）
PUBLIC_IP=$(curl -s --connect-timeout 5 https://api.ipify.org || curl -s --connect-timeout 5 https://ipv4.icanhazip.com || echo "localhost")

echo "=== 服务器完整部署脚本 ==="
echo "GitHub仓库: $GITHUB_REPO"
echo "项目目录: $PROJECT_DIR"
echo "端口: $PORT"
echo "公网IP: $PUBLIC_IP"
echo ""

# =========================
# 1. 检查并安装必要软件
# =========================
echo "检查并安装必要软件..."

# 更新包管理器
sudo apt update -y

# 安装Git（如果未安装）
if ! command -v git &> /dev/null; then
    echo "安装Git..."
    sudo apt install -y git
else
    echo "Git 已安装"
fi

# 安装Node.js 20（LTS版本，适合Next.js）
if ! command -v node &> /dev/null || [[ $(node --version | cut -d'.' -f1 | sed 's/v//') -lt 18 ]]; then
    echo "安装Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "Node.js 已安装 ($(node --version))"
fi

# 安装PM2（进程管理器）
if ! command -v pm2 &> /dev/null; then
    echo "安装PM2..."
    sudo npm install -g pm2
else
    echo "PM2 已安装"
fi

echo "✓ 软件检查完成"
echo ""

# =========================
# 2. 克隆或更新代码
# =========================
if [ -d "$PROJECT_DIR" ]; then
    echo "项目目录已存在，更新代码..."
    cd "$PROJECT_DIR"
    git pull origin main
else
    echo "克隆代码..."
    git clone "$GITHUB_REPO" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

echo "✓ 代码准备完成"
echo ""

# =========================
# 3. 安装依赖
# =========================
echo "安装项目依赖..."
npm install

echo "✓ 依赖安装完成"
echo ""

# =========================
# 4. 配置环境变量
# =========================
echo "配置环境变量..."

ENV_FILE=".env.local"
if [ ! -f "$ENV_FILE" ]; then
    echo "创建 $ENV_FILE 文件..."

    # 提示用户输入必要变量
    read -p "请输入 Supabase URL (NEXT_PUBLIC_SUPABASE_URL): " SUPABASE_URL
    read -p "请输入 Supabase 公开密钥 (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY): " SUPABASE_KEY
    read -p "请输入 Supabase 服务角色密钥 (SUPABASE_SERVICE_ROLE_KEY): " SERVICE_ROLE_KEY
    read -p "请输入站点标题 (NEXT_PUBLIC_SITE_TITLE，默认: Vibe Blog): " SITE_TITLE
    SITE_TITLE=${SITE_TITLE:-"Vibe Blog"}
    read -p "请输入站点描述 (NEXT_PUBLIC_SITE_DESCRIPTION，默认: 一个简洁的博客): " SITE_DESC
    SITE_DESC=${SITE_DESC:-"一个简洁的博客"}

    # 写入环境变量
    cat > "$ENV_FILE" << EOF
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$SUPABASE_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY

# 站点配置
NEXT_PUBLIC_SITE_TITLE=$SITE_TITLE
NEXT_PUBLIC_SITE_URL=https://$PUBLIC_IP:$PORT
NEXT_PUBLIC_SITE_DESCRIPTION=$SITE_DESC

# 端口配置
PORT=$PORT
EOF

    echo "✓ 环境变量配置完成"
else
    echo "$ENV_FILE 已存在，跳过配置"
fi

echo ""

# =========================
# 5. 构建项目
# =========================
echo "构建项目..."
npm run build

echo "✓ 构建完成"
echo ""

# =========================
# 6. 启动服务
# =========================
echo "启动服务..."

# 停止现有服务（如果存在）
pm2 delete vibe_blog_next 2>/dev/null || true
pm2 delete webhook 2>/dev/null || true

# 启动主应用
pm2 start scripts/ecosystem.config.js --only vibe_blog_next
pm2 save

# 启动webhook服务（如果需要）
if [ -f "scripts/webhook-server.js" ]; then
    pm2 start scripts/ecosystem.config.js --only webhook
    pm2 save
fi

echo "✓ 服务启动完成"
echo ""

# =========================
# 7. 健康检查
# =========================
echo "进行健康检查..."
HEALTH_URL="http://localhost:$PORT/api/healthz"
MAX_RETRIES=10
DELAY=5

for i in $(seq 1 $MAX_RETRIES); do
    if curl -s --connect-timeout 5 --max-time 10 "$HEALTH_URL" | grep -q '"status":"ok"'; then
        echo "✓ 健康检查通过！服务运行正常"
        echo ""
        echo "=== 部署完成 ==="
        echo "站点URL: https://$PUBLIC_IP:$PORT"
        echo "管理命令:"
        echo "  查看日志: pm2 logs"
        echo "  重启服务: pm2 restart vibe_blog_next"
        echo "  停止服务: pm2 stop vibe_blog_next"
        exit 0
    fi
    echo "  ⏳ 第 $i/$MAX_RETRIES 次检查: 服务未就绪"
    sleep $DELAY
done

echo "❌ 健康检查失败，请检查日志"
pm2 logs vibe_blog_next --lines 20
exit 1