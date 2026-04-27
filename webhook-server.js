const http = require('http')
const crypto = require('crypto')
const { exec } = require('child_process')

const SECRET = process.env.WEBHOOK_SECRET || ''
const PORT = parseInt(process.env.WEBHOOK_PORT || '8084', 10)

const DEPLOY_DIR = '/home/ewing/craft/vibe_blog_next'
let currentDeploy = null // 追踪当前部署进程

function runDeploy() {
  // 如果已有部署在跑，杀掉旧进程
  if (currentDeploy) {
    console.log(`[${new Date().toISOString()}] 终止上一次部署...`)
    currentDeploy.kill('SIGTERM')
    currentDeploy = null
  }

  const cmd = `cd ${DEPLOY_DIR} && git pull && bash deploy.sh`
  const proc = exec(cmd, { timeout: 600000, maxBuffer: 1024 * 1024 }, (err, stdout, stderr) => {
    currentDeploy = null
    if (err) {
      if (err.killed) {
        console.log(`[${new Date().toISOString()}] 部署被终止（新请求覆盖）`)
      } else {
        console.error(`[${new Date().toISOString()}] 部署失败:`, err.message)
        if (stderr) console.error(stderr)
      }
      return
    }
    console.log(`[${new Date().toISOString()}] 部署成功`)
  })
  proc.stdout?.on('data', (d) => process.stdout.write(`[deploy] ${d}`))
  proc.stderr?.on('data', (d) => process.stderr.write(`[deploy:err] ${d}`))
  currentDeploy = proc
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

    console.log(`[${new Date().toISOString()}] 收到 webhook 请求`)

    res.writeHead(202, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'accepted' }))

    runDeploy()
  })
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Webhook 接收器运行在 http://0.0.0.0:${PORT}`)
})

// PM2 停止时清理部署进程
process.on('SIGINT', () => {
  if (currentDeploy) currentDeploy.kill('SIGTERM')
  process.exit(0)
})
process.on('SIGTERM', () => {
  if (currentDeploy) currentDeploy.kill('SIGTERM')
  process.exit(0)
})
