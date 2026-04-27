module.exports = {
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
      script: 'webhook-server.js',
      env: {
        WEBHOOK_PORT: 8084,
        WEBHOOK_SECRET: '',
      },
    },
  ],
};
