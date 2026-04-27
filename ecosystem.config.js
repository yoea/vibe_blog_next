module.exports = {
  apps: [{
    name: 'vibe_blog_next',
    script: '.next/standalone/server.js',
    env: {
      PORT: 8083,
    },
  }],
};
