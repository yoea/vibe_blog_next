// 发版后脚本
// 从 CHANGELOG.md 提取当前版本的 release notes，更新为 git 附注标签
const fs = require('fs')
const path = require('path')
const os = require('os')

const pkg = require('../package.json')
const version = pkg.version
const changelog = fs.readFileSync(path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8')

// 从 CHANGELOG 中提取当前版本的 release notes
// 兼容 ## [0.2.0]（minor/major）和 ### [0.1.12]（patch）两种格式
const versionRegex = new RegExp(`^#{2,3}\\s\\[${version}\\]`, 'm')
const headerMatch = changelog.match(versionRegex)
let notes = headerMatch ? headerMatch[0] : `## [${version}]`
if (headerMatch) {
  const headerIndex = headerMatch.index
  const rest = changelog.slice(headerIndex + headerMatch[0].length)
  const nextHeader = rest.match(/\n#{2,3}\s\[/)
  const end = nextHeader ? nextHeader.index : rest.length
  notes = (headerMatch[0] + rest.slice(0, end)).trim()
}

// 写入临时文件，避免 shell 转义问题
const tmpFile = path.join(os.tmpdir(), `tag-msg-${version}.txt`)
fs.writeFileSync(tmpFile, notes, 'utf8')
execSync(`git tag -f -a v${version} -F "${tmpFile}" HEAD`, { stdio: 'inherit' })
fs.unlinkSync(tmpFile)

console.log(`✓ 附注标签 v${version} 已更新（含 CHANGELOG 内容）`)
