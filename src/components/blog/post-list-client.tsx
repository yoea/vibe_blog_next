'use client'

import { useState, useEffect } from 'react'
import { PostCard } from './post-card'
import { LoadMore } from '@/components/shared/load-more'

interface PostData {
  id: string
  author_id: string
  title: string
  slug: string
  published: boolean
  created_at: string
  excerpt?: string | null
  like_count?: number
  comment_count?: number
  author?: { email?: string | null; name?: string | null } | null
}

export function PostListClient({
  initialPosts,
  initialTotal,
  showActions,
  onLoadMore,
  loadedAllText = '已加载全部',
  linkRef,
}: {
  initialPosts: PostData[]
  initialTotal: number
  showActions?: boolean
  onLoadMore: (page: number) => Promise<{ data?: PostData[]; count?: number | null; error?: string | null }>
  loadedAllText?: string
  linkRef?: string
}) {
  const [posts, setPosts] = useState(initialPosts)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  // Sync with server props after refresh (e.g., post deletion)
  useEffect(() => {
    setPosts(initialPosts)
    setTotal(initialTotal)
    setPage(1)
  }, [initialPosts, initialTotal])

  const hasMore = posts.length < total

  const handleLoadMore = async () => {
    setLoading(true)
    const nextPage = page + 1
    const result = await onLoadMore(nextPage)
    const newPosts = result.data
    if (newPosts) {
      if (newPosts.length === 0) {
        return
      }
      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id))
        const trulyNew = newPosts.filter((p) => !existingIds.has(p.id))
        return [...prev, ...trulyNew]
      })
      setPage(nextPage)
    }
    setLoading(false)
  }

  if (!posts.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg mb-2">
          {showActions ? '还没有文章' : '还没有文章'}
        </p>
        <p className="text-sm">
          {showActions ? '点击右上角按钮开始写作' : '登录后可以写你的第一篇文章'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} showActions={showActions} linkRef={linkRef} />
        ))}
      </div>

      <LoadMore
        hasMore={hasMore}
        loading={loading}
        onLoadMore={handleLoadMore}
        remaining={total - posts.length}
        idleText="加载更多"
        loadedAllText={loadedAllText}
        showLoadedAll={false}
      />
    </div>
  )
}
