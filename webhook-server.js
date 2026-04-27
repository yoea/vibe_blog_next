const http = require('http')
const crypto = require('crypto')
const { exec } = require('child_process')

const SECRET = process.env.WEBHOOK_SECRET || ''
const PORT = parseInt(process.env.WEBHOOK_PORT || '8084', 10)

const DEPLOY_DIR = '/home/ewing/craft/vibe_blog_next'

function runDeploy() {
  const cmd = `cd ${DEPLOY_DIR} && git pull && bash deploy.sh`
  const proc = exec(cmd, { timeout: 600000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
    if (err) {
      console.error(`[${new Date().toISOString()}] 部署失败:`, err.message)
      if (stderr) console.error(stderr)
      return
    }
    console.log(`[${new Date().toISOString()}] 部署成功:`, stdout.slice(-500))
  })
  // 实时输出日志
  proc.stdout?.on('data', (d) => process.stdout.write(`[deploy] ${d}`))
  proc.stderr?.on('data', (d) => process.stderr.write(`[deploy:err] ${d}`))
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405)
    return res.end('Method Not Allowed')
  }

  let body = ''
  req.on('data', (chunk) => { body += chunk })
  req.on('end', () => {
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

    console.log(`[${new Date().toISOString()}] 收到 webhook 请求，开始部署...`)

    // 立即返回 202，后台异步执行部署
    res.writeHead(202, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'accepted' }))

    runDeploy()
  })
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Webhook 接收器运行在 http://0.0.0.0:${PORT}`)
})
