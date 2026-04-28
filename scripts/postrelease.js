const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const pkg = require('../package.json')
const version = pkg.version
const changelog = fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8')

// 从 CHANGELOG 中提取当前版本的 release notes
const versionHeader = `### [${version}]`
const headerIndex = changelog.indexOf(versionHeader)
let notes = versionHeader
if (headerIndex !== -1) {
  const nextHeader = changelog.indexOf('\n### [', headerIndex + 1)
  const end = nextHeader !== -1 ? nextHeader : changelog.length
  notes = changelog.slice(headerIndex, end).trim()
}

// 写入临时文件，避免 shell 转义问题
const tmpFile = path.join(os.tmpdir(), `tag-msg-${version}.txt`)
fs.writeFileSync(tmpFile, notes, 'utf8')
execSync(`git tag -f -a v${version} -F "${tmpFile}" HEAD`, { stdio: 'inherit' })
fs.unlinkSync(tmpFile)

console.log(`✓ 附注标签 v${version} 已更新（含 CHANGELOG 内容）`)
