import { readFileSync } from 'fs'
import { execSync } from 'child_process'
import { join } from 'path'

export interface BuildInfo {
  commit: string | null
  commitCount: number | null
  contributors: string | null
  buildTime: string | null
  nodeVersion: string
  version: string
}

export function getBuildInfo(): BuildInfo {
  let pkgVersion = '0.4.0'
  if (process.env.NEXT_PUBLIC_BUILD_VERSION) {
    pkgVersion = process.env.NEXT_PUBLIC_BUILD_VERSION
  } else {
    try {
      const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'))
      pkgVersion = pkg.version ?? pkgVersion
    } catch {
      // fallback
    }
  }

  const info: BuildInfo = {
    commit: process.env.NEXT_PUBLIC_BUILD_COMMIT ?? null,
    commitCount: process.env.NEXT_PUBLIC_BUILD_COMMIT_COUNT
      ? Number(process.env.NEXT_PUBLIC_BUILD_COMMIT_COUNT)
      : null,
    contributors: process.env.NEXT_PUBLIC_BUILD_CONTRIBUTORS ?? null,
    buildTime: process.env.NEXT_PUBLIC_BUILD_TIME ?? null,
    nodeVersion: process.version,
    version: pkgVersion,
  }

  // Dev mode: read live git data if env vars not injected
  if (process.env.NODE_ENV === 'development') {
    try {
      if (!info.commit) {
        info.commit = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim()
      }
      if (!info.commitCount) {
        info.commitCount = Number(execSync('git rev-list --count HEAD', { encoding: 'utf-8' }).trim())
      }
      if (!info.contributors) {
        const raw = execSync('git log --format="%an"', { encoding: 'utf-8', timeout: 5000 })
        info.contributors = [...new Set(raw.trim().split('\n').map(s => s.trim()).filter(Boolean))].join(', ')
      }
    } catch {
      // git not available, keep env values
    }
  }

  return info
}
