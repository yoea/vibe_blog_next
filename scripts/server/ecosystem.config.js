// PM2 进程配置
// 定义主应用 (vibe_blog_next) 和 webhook 接收器两个进程
const fs = require('fs');
const path = require('path');

// 从 .env.local 读取 PORT（PM2 重启时 shell 环境变量已丢失，不能依赖 process.env）
function getPort() {
  if (process.env.PORT) return parseInt(process.env.PORT, 10);
  try {
    const env = fs.readFileSync(
      path.join(__dirname, '..', '..', '.env.local'),
      'utf8',
    );
    const match = env.match(/^PORT=(\d+)/m);
    if (match) return parseInt(match[1], 10);
  } catch {}
  return 8083;
}

const PROJECT_DIR = path.resolve(__dirname, '..', '..');

module.exports = {
  apps: [
    {
      name: 'vibe_blog_next',
      script: path.join(PROJECT_DIR, '.next/standalone/server.js'),
      cwd: PROJECT_DIR,
      max_memory_restart: '512M',
      env: {
        PORT: getPort(),
      },
    },
    {
      name: 'webhook',
      script: path.join(PROJECT_DIR, 'scripts/server/webhook-server.js'),
      cwd: PROJECT_DIR,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      env: {
        WEBHOOK_PORT: 8084,
        TZ: 'Asia/Shanghai',
      },
    },
  ],
};
