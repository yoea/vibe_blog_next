// PM2 进程配置
// 定义主应用 (vibe_blog_next) 和 webhook 接收器两个进程
// PORT 优先读取环境变量，其次 .env.local，最后默认 8083
module.exports = {
  apps: [
    {
      name: 'vibe_blog_next',
      script: '.next/standalone/server.js',
      max_memory_restart: '512M',
      env: {
        PORT: process.env.PORT || 8083,
      },
    },
    {
      name: 'webhook',
      script: 'scripts/server/webhook-server.js',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      env: {
        WEBHOOK_PORT: 8084,
        TZ: 'Asia/Shanghai',
      },
    },
  ],
};
