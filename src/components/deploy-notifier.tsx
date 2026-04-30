'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { BadgeCheck, GitCommitHorizontal, Calendar, ExternalLink, Hash, Users, Server } from 'lucide-react'

const STORAGE_KEY = 'last_known_commit'

interface Props {
  enabled: boolean
}

export function DeployNotifier({ enabled }: Props) {
  const [open, setOpen] = useState(false)

  const buildCommit = process.env.NEXT_PUBLIC_BUILD_COMMIT
  const buildVersion = process.env.NEXT_PUBLIC_BUILD_VERSION
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME
  const buildCommitCount = process.env.NEXT_PUBLIC_BUILD_COMMIT_COUNT
  const buildContributors = process.env.NEXT_PUBLIC_BUILD_CONTRIBUTORS
  const buildHost = process.env.NEXT_PUBLIC_BUILD_HOST
  const formattedBuildTime = buildTime
    ? new Date(buildTime).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    : null

  useEffect(() => {
    if (!enabled || !buildCommit) return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === null) {
        // First visit — store current commit, don't show dialog
        localStorage.setItem(STORAGE_KEY, buildCommit)
        return
      }
      if (stored !== buildCommit) {
        // Version changed — show dialog and update stored commit
        setOpen(true)
        localStorage.setItem(STORAGE_KEY, buildCommit)
      }
    } catch {}
  }, [enabled, buildCommit])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <BadgeCheck className="h-5 w-5 text-green-500" />
            部署成功
          </DialogTitle>
          <DialogDescription>
            站点已升级到新版本
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {buildVersion && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <ExternalLink className="h-4 w-4" />
                版本
              </span>
              <a
                href={`https://github.com/yoea/vibe_blog_next/releases/tag/v${buildVersion}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                v{buildVersion}
              </a>
            </div>
          )}
          {buildCommit && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <GitCommitHorizontal className="h-4 w-4" />
                Commit
              </span>
              <span className="font-mono text-xs">{buildCommit}</span>
            </div>
          )}
          {formattedBuildTime && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                构建时间
              </span>
              <span className="text-xs">{formattedBuildTime}</span>
            </div>
          )}
          {buildCommitCount && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Hash className="h-4 w-4" />
                提交次数
              </span>
              <span className="font-mono text-xs">{buildCommitCount}</span>
            </div>
          )}
          {buildContributors && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-4 w-4" />
                贡献者
              </span>
              <span className="text-xs">{buildContributors}</span>
            </div>
          )}
          {buildHost && (
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Server className="h-4 w-4" />
                构建主机
              </span>
              <span className="font-mono text-xs">{buildHost}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
