# 发版指南

## 目录

- [流程概览](#流程概览)
- [前置：常规提交规范](#前置常规提交规范)
- [第一步：npm run release](#第一步npm-run-release)
- [第二步：推送双远程](#第二步推送双远程)
- [第三步：CI 质量门禁](#第三步ci-质量门禁)
- [第四步：GitHub Release 自动创建](#第四步github-release-自动创建)
- [文件清单](#文件清单)
- [关键注意事项](#关键注意事项)

---

## 流程概览

```
写代码 (Conventional Commits)
    │
    ▼
npm run release ─────────────────────────────────────┐
    │                                                │
    ├─ standard-version                               │
    │   ├─ 分析 commits，决定 bump 级别               │
    │   ├─ 修改 package.json version                 │
    │   ├─ 更新 CHANGELOG.md                         │
    │   ├─ git commit "chore: release vX.Y.Z"        │
    │   └─ git tag vX.Y.Z (轻量)                     │
    │                                                │
    └─ node scripts/build/postrelease.js              │
        └─ git tag -f -a vX.Y.Z (附注，含 CHANGELOG) │
                                                     │
    ▼                                                │
git push --follow-tags origin main                   │
git push --follow-tags github main                   │
    │                                                │
    ├─ GitHub Actions: CI (ci.yml)                   │
    │   └─ tsc --noEmit + ESLint                     │
    │                                                │
    └─ GitHub Actions: Release (release.yml)          │
        ├─ sed 提取 CHANGELOG 当前版本段落            │
        └─ gh release create (含完整 release notes)  │
```

---

## 前置：常规提交规范

日常开发必须使用 [Conventional Commits](https://www.conventionalcommits.org/) 格式。`standard-version` 根据 commit 前缀决定版本号 bump 级别：

| 前缀        | 含义     |    版本号影响     |
| ----------- | -------- | :---------------: |
| `feat:`     | 新功能   | **minor** (0.x.0) |
| `fix:`      | Bug 修复 | **patch** (0.0.x) |
| `chore:`    | 杂项变更 |       patch       |
| `docs:`     | 文档     |       patch       |
| `refactor:` | 重构     |       patch       |
| `perf:`     | 性能优化 |       patch       |

> `BREAKING CHANGE`（commit body 含此关键字，或标题以 `!` 结尾）触发 **major** 版本。

CHANGELOG 的分类标题（中文）由 `.versionrc` 控制。

---

## 第一步：npm run release

`package.json` 中定义了三组命令：

| 命令                    | 用途               |
| ----------------------- | ------------------ |
| `npm run release`       | 自动判断 bump 级别 |
| `npm run release:minor` | 强制 minor (0.x.0) |
| `npm run release:patch` | 强制 patch (0.0.x) |

每条命令的执行逻辑相同，由两部分串联：

```
standard-version && node scripts/build/postrelease.js
```

### 1.1 standard-version

`standard-version` 是 npm 包（devDependencies），读取 `.versionrc` 中的中文分类配置，依次执行：

1. **分析 commits** — 读取上次 tag 以来的所有 commit，按类型归类。
2. **Bump 版本号** — 修改 `package.json` 的 `version` 字段。
3. **更新 CHANGELOG.md** — 在文件顶部插入新版本条目。标题格式取决于 bump 级别：
   - minor / major → `## [0.5.0]`（两级 `#`）
   - patch → `### [0.4.3]`（三级 `#`）
4. **创建 release commit** — `chore: release vX.Y.Z`，包含 `package.json` 和 `CHANGELOG.md` 的变更。
5. **创建轻量 tag** — `git tag vX.Y.Z`（无附注，仅指针）。

### 1.2 postrelease.js

`scripts/build/postrelease.js` 是项目自定义脚本。`standard-version` 创建的轻量 tag 不含 release notes，所以此脚本将其**升级为附注 tag**：

1. 读取 `package.json` 获取当前版本号。
2. 读取 `CHANGELOG.md`，用正则 `^#{2,3}\s\[版本号\]` 定位当前版本段落。
3. 提取完整段落内容（从当前版本标题到下一个版本标题）。
4. 写入临时文件（避免 shell 转义问题）。
5. 执行 `git tag -f -a vX.Y.Z -F <临时文件> HEAD`：
   - `-f` — 强制覆盖 standard-version 的轻量 tag
   - `-a` — 创建附注 tag
   - `-F` — 以文件内容作为 tag message

**最终产物**：一个指向 release commit 的附注 tag，message 为当前版本的完整 CHANGELOG 段落。

---

## 第二步：推送双远程

项目配置了两个 git 远程：

| 名称     | 地址                                        | 平台   |
| -------- | ------------------------------------------- | ------ |
| `origin` | `git@git.ewing.top:yoea/vibe_blog_next.git` | Gitee  |
| `github` | `git@github.com:yoea/vibe_blog_next.git`    | GitHub |

```bash
git push --follow-tags origin main   # 推送到 Gitee
git push --follow-tags github main   # 推送到 GitHub
```

`--follow-tags` 确保 tag 和 commit 一起推送。推送 tag 到 GitHub 会触发下一步的 release workflow。

---

## 第三步：CI 质量门禁

**文件**：`.github/workflows/ci.yml`  
**触发条件**：push 或 PR 到 `main` 分支

在 GitHub Actions 上执行：

```
checkout@v5 → setup-node@v5 → npm ci → tsc --noEmit → npm run lint
```

纯粹的静态检查，不影响发版流程，但 CI 失败意味着代码存在问题，应修复后重新提交并 force-update tag。

---

## 第四步：GitHub Release 自动创建

**文件**：`.github/workflows/release.yml`  
**触发条件**：推送 `v*` 格式的 tag

### Step 1 — 提取 release notes

```bash
VERSION="${GITHUB_REF_NAME#v}"        # "v0.5.0" → "0.5.0"
NOTES=$(sed -nE "/^#{2,3} \[${VERSION}\]/,/^#{2,3} \[/p" CHANGELOG.md \
        | sed '1d' \
        | sed '$ { /^#{2,3} \[/d; }')
```

这个 sed 从 CHANGELOG.md 中裁剪当前版本的段落：

- `^#{2,3}` 兼容 minor/major 的两级标题 `##` 和 patch 的三级标题 `###`
- 范围从当前版本标题到下一个版本标题
- 去掉首尾的标题行，只保留正文

如果 CHANGELOG 中无匹配内容（`$NOTES` 为空），fallback 为 `"Release vX.Y.Z"`。

### Step 2 — 创建 Release

```bash
gh release create "v0.5.0" \
  --title "v0.5.0" \
  --notes "$NOTES"
```

`${{ github.ref_name }}` 对于 tag `v0.5.0` 返回 `v0.5.0`，title 正确显示单个 `v` 前缀。

---

## 文件清单

| 文件                            |           来源            | 作用                                                    |
| ------------------------------- | :-----------------------: | ------------------------------------------------------- |
| `package.json` (scripts)        |         项目自带          | 定义 `release` / `release:minor` / `release:patch` 命令 |
| `.versionrc`                    |         项目自带          | `standard-version` 配置，定义 CHANGELOG 中文分类标题    |
| `CHANGELOG.md`                  | standard-version 自动维护 | 所有版本的更新记录，release notes 的**唯一数据源**      |
| `scripts/build/postrelease.js`  |        项目自定义         | 将轻量 tag 升级为附注 tag，message = CHANGELOG 段落     |
| `.github/workflows/ci.yml`      |        项目自定义         | 每次 push/PR 执行 TypeScript 类型检查 + ESLint          |
| `.github/workflows/release.yml` |        项目自定义         | tag 推送时从 CHANGELOG 提取内容，创建 GitHub Release    |

---

## 关键注意事项

### Tag 指向的 commit 决定 workflow 行为

Release workflow 运行时执行的是 **tag 所指向 commit** 的 `.github/workflows/release.yml`，不是 main 分支最新 commit。

> 如果 workflow 修复提交在 tag 之后，必须执行：
>
> ```bash
> git tag -f vX.Y.Z HEAD
> node scripts/build/postrelease.js
> git push --force github vX.Y.Z
> ```
>
> 将 tag 移到包含修复的 commit，否则修复不生效。

### CHANGELOG 标题级别

standard-version 对 minor/major 生成 `## [版本]`，对 patch 生成 `### [版本]`。release.yml 的 `^#{2,3}` 正则兼容两者，`postrelease.js` 同样使用 `^#{2,3}` 匹配。

### Git Tag 仍然必要

即使 GitHub 自动创建了 Release，git tag 仍不可替代：

- `standard-version` 依赖 tag 确定发版范围（`git describe --tags`）
- `release.yml` 以 tag 推送为触发条件
- 附注 tag 在 git 仓库中永久保存 release notes，与平台无关
- Gitee 不触发 GitHub Release，但 tag 推送后 Gitee 仓库同样能看到版本标记

### 版本号唯一来源

`package.json` 的 `version` 字段是唯一版本来源。部署时 `deploy-local.mjs` 将其注入 `NEXT_PUBLIC_BUILD_VERSION` 环境变量。Git tag 只是标记，不参与版本显示。
