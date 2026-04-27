'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDaysAgo } from '@/lib/utils/time'
import { getUserColor } from '@/lib/utils/colors'
import { Avatar } from '@/components/ui/avatar'

interface AuthorData {
  id: string
  displayName: string
  avatarUrl: string | null
  createdAt: string
  isDeleted: boolean
  deletedAt: string | null
  postCount: number
}

export function AuthorListClient({
  initialAuthors,
  initialHasMore,
  onLoadMore,
}: {
  initialAuthors: AuthorData[]
  initialHasMore: boolean
  onLoadMore: (page: number) => Promise<{ data?: AuthorData[]; count?: number; hasMore?: boolean; error?: string | null }>
}) {
  const [authors, setAuthors] = useState(initialAuthors)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialHasMore)

  // Sync when initialAuthors changes (e.g., after refresh)
  useEffect(() => {
    setAuthors(initialAuthors)
    setPage(1)
    setHasMore(initialHasMore)
  }, [initialAuthors, initialHasMore])

  const handleLoadMore = async () => {
    setLoading(true)
    const nextPage = page + 1
    const result = await onLoadMore(nextPage)
    if (result.data) {
      setAuthors((prev) => {
        const existingIds = new Set(prev.map((a) => a.id))
        const newAuthors = result.data!.filter((a) => !existingIds.has(a.id))
        return [...prev, ...newAuthors]
      })
      setPage(nextPage)
      if (!result.hasMore) setHasMore(false)
    }
    setLoading(false)
  }

  if (!authors.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>暂无作者</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{authors.length}+ 位注册用户</p>

      <div className="grid gap-3">
        {authors.map((user) => {
          const days = formatDaysAgo(user.createdAt)

          return (
            <Link
              key={user.id}
              href={`/author/${user.id}`}
              className="block rounded-lg border bg-card p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar
                    avatarUrl={user.avatarUrl}
                    displayName={user.displayName}
                    userId={user.id}
                    size="sm"
                    defer
                  />
                  <div>
                    <span
                      className="font-semibold text-base"
                      style={{ color: getUserColor(user.id) }}
                    >
                      {user.displayName}
                    </span>
                    <div className="text-[10px] text-muted-foreground leading-tight">{user.id.slice(0, 8)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>文章{user.postCount}篇</span>
                  <span>注册 {days}</span>
                  {user.isDeleted && (
                    <span className="inline-flex items-center gap-1 text-gray-400">
                      <span className="inline-block h-2 w-2 rounded-full bg-gray-300" />
                      已注销
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-md border bg-card hover:bg-muted transition-colors disabled:opacity-50"
          >
            {loading ? '加载中...' : '加载更多'}
          </button>
        </div>
      )}
    </div>
  )
}
