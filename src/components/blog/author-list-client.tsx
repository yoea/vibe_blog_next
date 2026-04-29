'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatDaysAgo } from '@/lib/utils/time'
import { getUserColor } from '@/lib/utils/colors'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { LoadMore } from '@/components/shared/load-more'
import { Shield, Trash2 } from 'lucide-react'
import { GitHubIcon } from '@/components/icons/github-icon'
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
  githubId: string | null
  githubUsername: string | null
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
  const router = useRouter()
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
          const isProtected = isAdmin && (user.id === currentUserId || adminUserIds?.includes(user.id))

          return (
            <div
              key={user.id}
              className="flex items-center rounded-lg border bg-card hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/author/${user.id}`)}
            >
              <div className="flex-1 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <Avatar
                      avatarUrl={user.avatarUrl}
                      displayName={user.displayName}
                      userId={user.id}
                      size="sm"
                      defer
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="font-semibold text-base"
                          style={{ color: getUserColor(user.id) }}
                        >
                          {user.displayName}
                        </span>
                        {adminUserIds?.includes(user.id) && (
                          <span title="管理员">
                            <Shield className="h-3.5 w-3.5 text-yellow-500" />
                          </span>
                        )}
                        {user.githubUsername && (
                          <span
                            role="link"
                            tabIndex={0}
                            className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title="访问作者的 GitHub 主页"
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(`https://github.com/${user.githubUsername}`, '_blank', 'noopener,noreferrer')
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation()
                                window.open(`https://github.com/${user.githubUsername}`, '_blank', 'noopener,noreferrer')
                              }
                            }}
                          >
                            <GitHubIcon className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground leading-tight">{user.id.slice(0, 8)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                    <span>文章{user.postCount}篇</span>
                    <span>注册 {days}</span>
                    <span className={`inline-flex items-center gap-1 ${hasPosts ? 'text-green-600' : 'text-muted-foreground'}`}>
                      <span className={`inline-block h-2 w-2 rounded-full ${hasPosts ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {hasPosts ? '活跃' : '无文'}
                    </span>
                  </div>
                </div>
              </div>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={isProtected}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!isProtected) setConfirmDeleteId(user.id)
                  }}
                  className={`mr-2 h-6 w-6 ${isProtected ? 'text-muted-foreground/40' : 'text-muted-foreground hover:text-destructive'}`}
                  title={isProtected ? undefined : '删除用户'}
                >
                  {isProtected ? <Shield className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                </Button>
              )}
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
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
                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                      <span>文章{user.postCount}篇</span>
                      <span>注册 {days}</span>
                      <span className="inline-flex items-center gap-1 text-gray-400">
                        <span className="inline-block h-2 w-2 rounded-full bg-gray-300" />
                        注销
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
        <LoadMore
          hasMore={hasMore}
          loading={loading}
          onLoadMore={handleLoadMore}
          idleText="加载更多"
          showLoadedAll={false}
        />
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
