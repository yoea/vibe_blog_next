'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { BadgeCheck, GitCommitHorizontal, Clock, Calendar, ExternalLink } from 'lucide-react'

interface DeployInfo {
  duration: number
  timestamp: number
}

function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  if (min === 0) return `${sec} 秒`
  return `${min} 分 ${sec} 秒`
}

export function DeployNotifier() {
  const [open, setOpen] = useState(false)
  const [deployInfo, setDeployInfo] = useState<DeployInfo | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('deploy_info')
      if (!raw) return
      const info: DeployInfo = JSON.parse(raw)
      // 仅 5 分钟内的部署信息有效
      if (Date.now() - info.timestamp > 5 * 60 * 1000) {
        localStorage.removeItem('deploy_info')
        return
      }
      setDeployInfo(info)
      setOpen(true)
      localStorage.removeItem('deploy_info')
    } catch {}
  }, [])

  if (!deployInfo) return null

  const buildVersion = process.env.NEXT_PUBLIC_BUILD_VERSION
  const buildCommit = process.env.NEXT_PUBLIC_BUILD_COMMIT
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME
  const formattedBuildTime = buildTime
    ? new Date(buildTime).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    : null

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
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" />
              部署耗时
            </span>
            <span className="font-mono text-xs">{formatDuration(deployInfo.duration)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
