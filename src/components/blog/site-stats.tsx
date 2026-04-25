'use client'

import { useEffect, useState } from 'react'
import { Heart, Eye } from 'lucide-react'

import { toast } from 'sonner'

const MAX_CLICKS_PER_HOUR = 10
const CLICK_COOLDOWN_MS = 3000

export function SiteStats({ initialViews, initialLikes }: { initialViews: number; initialLikes: number }) {
  const [views, setViews] = useState(initialViews)
  const [likes, setLikes] = useState(initialLikes)

  useEffect(() => {
    // Record visit
    navigator.sendBeacon('/api/site-stats', JSON.stringify({ type: 'view', ts: Date.now() }))
  }, [])

  const handleLike = async () => {
    const clickTimes: number[] = JSON.parse(localStorage.getItem('site_click_times') ?? '[]')
    const now = Date.now()
    const oneHourAgo = now - 3600000

    // Filter clicks within last hour
    const recentClicks = clickTimes.filter((t) => t > oneHourAgo)
    if (recentClicks.length >= MAX_CLICKS_PER_HOUR) {
      toast.info('感谢你的喜爱！今天已经点赞够了，明天再来吧 😊')
      return
    }

    // Check cooldown (3 seconds)
    if (recentClicks.length > 0 && now - recentClicks[recentClicks.length - 1] < CLICK_COOLDOWN_MS) {
      toast.info('点赞太频繁啦，请稍等一会儿再点击 😄')
      return
    }

    recentClicks.push(now)
    localStorage.setItem('site_click_times', JSON.stringify(recentClicks))

    setLikes((p) => p + 1)

    navigator.sendBeacon('/api/site-stats', JSON.stringify({ type: 'like', ts: now }))
  }

  return (
    <div className="flex items-center justify-center gap-3 text-muted-foreground">
      <button
        onClick={handleLike}
        className="flex items-center gap-1 text-[9px] cursor-pointer transition-colors hover:text-pink-500"
      >
        <Heart className="h-3 w-3 fill-pink-400 text-pink-400" />
        <span>{likes}</span>
      </button>
      <div className="flex items-center gap-1 text-[9px]">
        <Eye className="h-3 w-3" />
        <span>{views}</span>
      </div>
    </div>
  )
}
