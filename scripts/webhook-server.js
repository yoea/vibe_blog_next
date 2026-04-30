// Webhook 接收服务器
// 监听 GitHub/Gitee 推送事件，分支推送自动拉取代码保持服务端同步
// 部署通过本地构建 + 上传完成，见 scripts/deploy-local.mjs
const http = require('http')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const PORT = parseInt(process.env.WEBHOOK_PORT || '8084', 10)

function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '..', '.env.local')
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

// 获取本地时间字符串 (UTC+8)
function localTime() {
  return new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
}

function pullOnly() {
  console.log(`[${localTime()}] 执行 git pull 拉取最新代码...`)
  const proc = spawn('bash', ['-c', 'git fetch origin && git reset --hard origin/main'], { cwd: DEPLOY_DIR, stdio: 'inherit' })
  proc.on('exit', (code) => {
    if (code === 0) {
      console.log(`[${localTime()}] git pull 完成，代码已更新至最新`)
    } else {
      console.error(`[${localTime()}] git pull 失败 (exit ${code})`)
    }
  })
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

    console.log(`[${localTime()}] 收到 webhook 请求`)

    // 解析推送事件信息（GitHub / Gitee 格式兼容）
    let ref = ''
    try {
      const payload = JSON.parse(body)
      ref = payload.ref || ''
    } catch { /* 非 JSON 体，跳过 */ }

    const isTagPush = ref.startsWith('refs/tags/')

    // Tag 推送不再触发自动部署（已改为本地构建上传），仅记录日志
    if (isTagPush) {
      console.log(`[${localTime()}] Tag 推送: ${ref}（已改为本地部署，不触发自动构建）`)
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ignored', reason: 'tag deploy disabled, use npm run deploy:local' }))
      return
    }

    // 分支推送：自动拉取代码
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'pulling', ref }))

    console.log(`[${localTime()}] 分支推送，拉取代码（ref=${ref}）`)
    pullOnly()
  })
})

server.listen(PORT, '0.0.0.0', () => {
  const status = SECRET ? '签名验证已启用' : '⚠️ 无签名验证（不安全）'
  console.log(`Webhook 接收器运行在 http://0.0.0.0:${PORT}（${status}）`)
})
