// PM2 进程配置
// 定义主应用 (vibe_blog_next) 和 webhook 接收器两个进程
  apps: [
    {
      name: 'vibe_blog_next',
      script: '.next/standalone/server.js',
      env: {
        PORT: 8083,
      },
    },
    {
      name: 'webhook',
      script: 'scripts/webhook-server.js',
      env: {
        WEBHOOK_PORT: 8084,
      },
    },
  ],
};
