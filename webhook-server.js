const http = require('http')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const PORT = parseInt(process.env.WEBHOOK_PORT || '8084', 10)

function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '.env.local')
    const content = fs.readFileSync(envPath, 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  } catch { /* .env.local 不存在就跳过 */ }
}

loadEnvFile()

const SECRET = process.env.WEBHOOK_SECRET || null

const DEPLOY_DIR = '/home/ewing/craft/vibe_blog_next'
let currentDeploy = null // 追踪当前部署进程

function runDeploy() {
  // 如果已有部署在跑，杀掉整个进程组（包括所有子进程）
  if (currentDeploy) {
    console.log(`[${new Date().toISOString()}] 终止上一次部署...`)
    try { process.kill(-currentDeploy.pid, 'SIGTERM') } catch {}
    currentDeploy = null
  }

  const proc = spawn('bash', ['-c', `cd ${DEPLOY_DIR} && git pull && bash deploy.sh`], {
    detached: true,   // 创建新进程组，便于整树清理
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 600000,
  })

  proc.stdout?.on('data', (d) => process.stdout.write(`[deploy] ${d}`))
  proc.stderr?.on('data', (d) => process.stderr.write(`[deploy:err] ${d}`))
  proc.on('exit', (code, signal) => {
    currentDeploy = null
    if (code === 0) {
      console.log(`[${new Date().toISOString()}] 部署成功`)
    } else if (signal === 'SIGTERM') {
      console.log(`[${new Date().toISOString()}] 部署被终止（新请求覆盖）`)
    } else {
      console.error(`[${new Date().toISOString()}] 部署失败 (exit ${code})`)
    }
  })

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

    // 解析推送事件信息（GitHub / Gitee 格式兼容）
    let eventInfo = {}
    try {
      const payload = JSON.parse(body)
      eventInfo = {
        repository: payload.repository?.name || payload.repository?.full_name || null,
        branch: (payload.ref || '').replace('refs/heads/', '') || null,
        pusher: payload.pusher?.name || payload.sender?.login || null,
        commits: Array.isArray(payload.commits) ? payload.commits.length : null,
      }
    } catch { /* 非 JSON 体，跳过 */ }

    const cancelledPrevious = !!currentDeploy
    res.writeHead(202, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'accepted',
      timestamp: new Date().toISOString(),
      deploy: {
        cancelled_previous: cancelledPrevious,
        ...eventInfo,
      },
    }))

    runDeploy()
  })
})

server.listen(PORT, '0.0.0.0', () => {
  const status = SECRET ? '签名验证已启用' : '⚠️ 无签名验证（不安全）'
  console.log(`Webhook 接收器运行在 http://0.0.0.0:${PORT}（${status}）`)
})

// PM2 停止时清理部署进程组
process.on('SIGINT', () => {
  if (currentDeploy) { try { process.kill(-currentDeploy.pid, 'SIGTERM') } catch {} }
  process.exit(0)
})
process.on('SIGTERM', () => {
  if (currentDeploy) { try { process.kill(-currentDeploy.pid, 'SIGTERM') } catch {} }
  process.exit(0)
})
