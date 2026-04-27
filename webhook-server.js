const http = require('http')
const crypto = require('crypto')
const { execSync } = require('child_process')

const SECRET = process.env.WEBHOOK_SECRET || ''
const PORT = parseInt(process.env.WEBHOOK_PORT || '8084', 10)

const server = http.createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405)
    return res.end('Method Not Allowed')
  }

  let body = ''
  req.on('data', (chunk) => { body += chunk })
  req.on('end', () => {
    // Verify HMAC-SHA256 signature (Gitea webhook secret)
    if (SECRET) {
      const sig = req.headers['x-hub-signature-256']
      if (!sig) {
        res.writeHead(403)
        return res.end('Forbidden: missing signature')
      }
      const expected = 'sha256=' + crypto.createHmac('sha256', SECRET).update(body).digest('hex')
      if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
        res.writeHead(403)
        return res.end('Forbidden: invalid signature')
      }
    }

    console.log('收到 webhook 请求，开始部署...')

    try {
      const output = execSync(
        'cd /home/ewing/craft/vibe_blog_next && git pull && bash deploy.sh',
        { timeout: 120000, stdio: 'pipe' }
      ).toString()
      console.log('部署成功:', output.slice(-500))
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok' }))
    } catch (err) {
      console.error('部署失败:', err.message)
      res.writeHead(500)
      res.end(JSON.stringify({ status: 'error', message: err.message }))
    }
  })
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Webhook 接收器运行在 http://0.0.0.0:${PORT}`)
})
