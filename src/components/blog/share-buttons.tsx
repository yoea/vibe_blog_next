'use client'

import { useState } from 'react'
import { Share2, Link, Check, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ShareButtonsProps {
  title: string
  slug: string
}

export function ShareButtons({ title, slug }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)
  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/posts/${slug}`
  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  const copyLink = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('链接已复制')
    setTimeout(() => setCopied(false), 2000)
  }

  const shareVia = async (platform?: string) => {
    if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`, '_blank', 'noopener')
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank', 'noopener')
    } else if (navigator.share) {
      navigator.share({ title, url })
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground mr-1">分享</span>
      <Button variant="ghost" size="sm" onClick={copyLink} title="复制链接" className="h-8 w-8 p-0">
        {copied ? <Check className="h-4 w-4" /> : <Link className="h-4 w-4" />}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => shareVia('twitter')} title="分享到 X" className="h-8 px-2 gap-1 text-xs">
        <ExternalLink className="h-3.5 w-3.5" /> X
      </Button>
      <Button variant="ghost" size="sm" onClick={() => shareVia('facebook')} title="分享到 Facebook" className="h-8 px-2 gap-1 text-xs">
        <ExternalLink className="h-3.5 w-3.5" /> FB
      </Button>
      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <Button variant="ghost" size="sm" onClick={() => shareVia()} title="更多分享方式" className="h-8 w-8 p-0">
          <Share2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
