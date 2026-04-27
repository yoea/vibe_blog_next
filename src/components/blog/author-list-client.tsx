'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDaysAgo } from '@/lib/utils/time'
import { getUserColor } from '@/lib/utils/colors'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
  isAdmin,
  onDeleteUser,
  currentUserId,
  adminUserIds,
}: {
  initialAuthors: AuthorData[]
  initialHasMore: boolean
  onLoadMore: (page: number) => Promise<{ data?: AuthorData[]; count?: number; hasMore?: boolean; error?: string | null }>
  isAdmin?: boolean
  onDeleteUser?: (userId: string) => Promise<{ error?: string }>
  currentUserId?: string
  adminUserIds?: string[]
}) {
  const [authors, setAuthors] = useState(initialAuthors)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

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

  const handleDelete = async (userId: string) => {
    if (!onDeleteUser) return
    setDeleting(true)
    const result = await onDeleteUser(userId)
    if (result.error) {
      toast.error(result.error)
    } else {
      setAuthors((prev) =>
        prev.map((a) =>
          a.id === userId ? { ...a, isDeleted: true, deletedAt: new Date().toISOString() } : a
        )
      )
      setConfirmDeleteId(null)
      toast.success('已删除用户')
    }
    setDeleting(false)
  }

  if (!authors.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>暂无作者</p>
      </div>
    )
  }

  const activeAuthors = authors.filter((a) => !a.isDeleted)
  const deletedAuthors = authors.filter((a) => a.isDeleted)

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{authors.length} 位用户</p>

      <div className="grid gap-3">
        {activeAuthors.map((user) => {
          const days = formatDaysAgo(user.createdAt)
          const hasPosts = user.postCount > 0

          return (
            <div key={user.id} className="relative">
              <Link
                href={`/author/${user.id}`}
                className={`block rounded-lg border bg-card p-4 hover:shadow-md transition-shadow ${isAdmin ? 'pr-10' : ''}`}
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
                    <span className={`inline-flex items-center gap-1 ${hasPosts ? 'text-green-600' : 'text-muted-foreground'}`}>
                      <span className={`inline-block h-2 w-2 rounded-full ${hasPosts ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {hasPosts ? '活跃' : '未发布'}
                    </span>
                  </div>
                </div>
              </Link>
              {isAdmin && (() => {
                const isProtected = user.id === currentUserId || adminUserIds?.includes(user.id)
                const tooltip = user.id === currentUserId ? '不能删除自己' : '不能删除其他管理员'
                return (
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={isProtected}
                    title={isProtected ? tooltip : undefined}
                    onClick={isProtected ? undefined : () => setConfirmDeleteId(user.id)}
                    className={`absolute top-1/2 -translate-y-1/2 right-2 h-6 w-6 ${isProtected ? 'text-gray-300 cursor-not-allowed' : 'text-muted-foreground hover:text-destructive'}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )
              })()}
            </div>
          )
        })}
      </div>

      {deletedAuthors.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-muted-foreground pt-4 border-t">已注销用户</h2>
          <div className="grid gap-3">
            {deletedAuthors.map((user) => {
              const days = formatDaysAgo(user.createdAt)

              return (
                <Link
                  key={user.id}
                  href={`/author/${user.id}`}
                  className="block rounded-lg border bg-card p-4 hover:shadow-md transition-shadow opacity-60"
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
                      <span className="inline-flex items-center gap-1 text-gray-400">
                        <span className="inline-block h-2 w-2 rounded-full bg-gray-300" />
                        已注销
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}

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

      <Dialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除用户</DialogTitle>
            <DialogDescription>
              确定删除该用户？此操作将禁用其账号、扰乱密码，不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeleteId(null)} disabled={deleting}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)} disabled={deleting}>
              {deleting ? '删除中...' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
