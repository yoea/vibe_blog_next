'use client'

import { useState, useEffect } from 'react'
import { Link, Check } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { QRCodeSVG } from 'qrcode.react'

interface ShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string
}

export function ShareDialog({ open, onOpenChange, url }: ShareDialogProps) {
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // HTTP 环境降级方案
      const textarea = document.createElement('textarea')
      textarea.value = url
      textarea.style.position = 'fixed'
      textarea.style.top = '0'
      textarea.style.left = '0'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopied(true)
    toast.success('链接已复制')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>分享文章</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-3">
            <p className="text-xs text-center text-muted-foreground">扫码分享</p>
            <div className="flex justify-center">
              <div className="rounded-lg border p-2">
                {mounted && <QRCodeSVG value={url} size={160} />}
              </div>
            </div>
          </div>

          <Button className="w-full gap-2" onClick={copyLink}>
            {copied ? <Check className="h-4 w-4" /> : <Link className="h-4 w-4" />}
            {copied ? '已复制' : '复制链接'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
