'use client'

import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface LoadMoreProps {
  hasMore: boolean
  loading: boolean
  onLoadMore: () => void
  /** 剩余未展示的数量（可选，传此值则按钮显示为 "剩余 X 条未展示，点击加载更多"） */
  remaining?: number
  idleText?: string
  loadingText?: string
  loadedAllText?: string
  /** 是否在加载完所有内容后显示 "已加载全部" 文案（默认 true） */
  showLoadedAll?: boolean
}

export function LoadMore({
  hasMore,
  loading,
  onLoadMore,
  remaining,
  idleText = '加载更多',
  loadingText = '加载中...',
  loadedAllText = '已加载全部',
  showLoadedAll = true,
}: LoadMoreProps) {
  if (hasMore) {
    const label =
      remaining && remaining > 0
        ? `剩余 ${remaining} 条未展示，点击加载更多`
        : idleText

    return (
      <div className="flex justify-center pt-2">
        <Button variant="outline" size="sm" onClick={onLoadMore} disabled={loading}>
          {loading && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
          {loading ? loadingText : label}
        </Button>
      </div>
    )
  }

  if (showLoadedAll) {
    return (
      <div className="flex justify-center pt-2">
        <span className="text-sm text-muted-foreground/60">{loadedAllText}</span>
      </div>
    )
  }

  return null
}
