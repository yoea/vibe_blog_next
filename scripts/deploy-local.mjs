#!/usr/bin/env node
// 本地构建 + 上传部署脚本（Node.js 版，兼容 PowerShell/cmd/Git Bash）
// 用法: node scripts/deploy-local.mjs [--skip-build]

import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, unlinkSync, statSync, mkdirSync, cpSync, rmSync } from 'node:fs'
import { resolve, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// =========================
// 配置（优先读取 ~/.ssh/config，可通过环境变量覆盖）
// =========================
const SSH_HOST = process.env.SSH_HOST || 'ewing.top'
const SERVER_DIR = process.env.SERVER_DIR || '/home/ewing/craft/vibe_blog_next'
const ARTIFACT_NAME = 'deploy-artifact.tar.gz'

const skipBuild = process.argv.includes('--skip-build')

// 项目根目录（scripts/ 的上一级）
const PROJECT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
process.chdir(PROJECT_DIR)

// SSH 连接使用 ~/.ssh/config 中的 Host 别名，端口/密钥/用户名均由 config 管理
const sshOpts = [
  '-o ConnectTimeout=10',
  '-o BatchMode=yes',
].join(' ')
const sshTarget = SSH_HOST
const startTime = Date.now()

function run(cmd, opts = {}) {
  console.log(`  $ ${cmd}`)
  return execSync(cmd, { stdio: 'inherit', ...opts })
}

function runSilent(cmd) {
  return execSync(cmd, { encoding: 'utf-8' }).trim()
}

console.log('=== 本地部署 ===')
console.log(`目标: ${sshTarget}:${SERVER_DIR}`)

// =========================
// 1. 预检
// =========================
if (!existsSync('package.json')) {
  console.error('❌ 未在项目根目录')
  process.exit(1)
}

console.log('测试 SSH 连接...')
try {
  runSilent(`ssh ${sshOpts} ${sshTarget} "echo ok"`)
  console.log('  ✓ SSH 连接正常')
} catch {
  console.error('❌ SSH 连接失败')
  process.exit(1)
}

if (!skipBuild) {
  try {
    const status = runSilent('git status --porcelain')
    if (status) console.log('⚠️  工作区有未提交的更改')
  } catch { /* git not available, skip */ }
}

// =========================
// 2. 构建
// =========================
if (!skipBuild) {
  console.log('构建项目...')

  const buildTime = new Date().toISOString().replace(/\.\d+Z$/, 'Z')
  let buildCommit = 'unknown'
  let buildCommitCount = '0'
  let buildContributors = ''
  let buildVersion = '0.0.0'

  try { buildCommit = runSilent('git rev-parse --short HEAD') } catch {}
  try { buildCommitCount = runSilent('git rev-list --count HEAD') } catch {}
  try {
    const authors = runSilent('git log --format=%an').split('\n')
    buildContributors = [...new Set(authors)].join(',')
  } catch {}
  try {
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8'))
    buildVersion = pkg.version || '0.0.0'
  } catch {}

  // 注入构建变量
  process.env.NEXT_PUBLIC_BUILD_TIME = buildTime
  process.env.NEXT_PUBLIC_BUILD_COMMIT = buildCommit
  process.env.NEXT_PUBLIC_BUILD_COMMIT_COUNT = buildCommitCount
  process.env.NEXT_PUBLIC_BUILD_CONTRIBUTORS = buildContributors
  process.env.NEXT_PUBLIC_BUILD_VERSION = buildVersion

  // 清理旧构建
  if (existsSync('.next')) rmSync('.next', { recursive: true, force: true })

  run('npx next build', {
    env: {
      ...process.env,
      NODE_OPTIONS: '--max-old-space-size=768',
    },
  })

  // 组装 standalone
  const standaloneDir = '.next/standalone'
  mkdirSync(join(standaloneDir, 'public'), { recursive: true })
  mkdirSync(join(standaloneDir, '.next', 'static'), { recursive: true })
  cpSync('public', join(standaloneDir, 'public'), { recursive: true })
  cpSync('.next/static', join(standaloneDir, '.next', 'static'), { recursive: true })

  // 写入构建元数据
  const meta = [
    `build_time=${buildTime}`,
    `build_commit=${buildCommit}`,
    `build_commit_count=${buildCommitCount}`,
    `build_contributors=${buildContributors}`,
    `build_version=${buildVersion}`,
    `build_host=${process.env.COMPUTERNAME || 'unknown'}`,
  ].join('\n')
  writeFileSync(join(standaloneDir, '.deploy-meta'), meta)

  console.log('  ✓ 构建完成')
} else {
  console.log('跳过构建 (--skip-build)')
  if (!existsSync('.next/standalone/server.js')) {
    console.error('❌ .next/standalone/server.js 不存在，请先执行一次完整构建')
    process.exit(1)
  }
}

// =========================
// 3. 打包
// =========================
console.log('打包产物...')
const artifactPath = join(PROJECT_DIR, ARTIFACT_NAME)
try {
  // Windows 自带 tar（Windows 10 build 17063+）
  run(`tar czf "${ARTIFACT_NAME}" -C .next/standalone .`)
} catch {
  console.error('❌ tar 命令不可用，请确保 Windows 10 17063+ 或安装 Git Bash')
  process.exit(1)
}

const size = statSync(artifactPath).size
const sizeMB = (size / 1024 / 1024).toFixed(1)
console.log(`  ✓ 打包完成: ${ARTIFACT_NAME} (${sizeMB} MB)`)

// =========================
// 4. 上传
// =========================
console.log('上传到服务器...')
try {
  run(`scp ${sshOpts} "${ARTIFACT_NAME}" ${sshTarget}:/tmp/`)
  console.log('  ✓ 上传完成')
} catch {
  console.error('❌ 上传失败')
  try { unlinkSync(artifactPath) } catch {}
  process.exit(1)
}

// =========================
// 5. 远端部署
// =========================
console.log('触发远端部署...')
try {
  run(`ssh ${sshOpts} ${sshTarget} "bash ${SERVER_DIR}/scripts/deploy-remote.sh"`)
} catch {
  console.error('❌ 远端部署失败')
  try { unlinkSync(artifactPath) } catch {}
  process.exit(1)
}

// =========================
// 6. 清理
// =========================
try { unlinkSync(artifactPath) } catch {}

const elapsed = Math.floor((Date.now() - startTime) / 1000)
const min = Math.floor(elapsed / 60)
const sec = elapsed % 60

console.log('=== 部署完成 ===')
console.log(`耗时: ${min}分${sec}秒`)
