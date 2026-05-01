'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw, Trash2, Search, Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { restorePost, permanentlyDeleteArchive } from '@/lib/actions/archive-actions'
import type { ArchivedPostWithAuthor } from '@/lib/db/types'

interface Props {
  archives: ArchivedPostWithAuthor[]
  total: number
  page: number
  search: string
}

export function ArchiveList({ archives, total, page, search }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [restoreTarget, setRestoreTarget] = useState<ArchivedPostWithAuthor | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ArchivedPostWithAuthor | null>(null)
  const [searchValue, setSearchValue] = useState(search)

  const pageSize = 20
  const totalPages = Math.ceil(total / pageSize)

  const handleRestore = () => {
    if (!restoreTarget) return
    startTransition(async () => {
      const result = await restorePost(restoreTarget.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('文章已恢复')
        setRestoreTarget(null)
        router.refresh()
      }
    })
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    startTransition(async () => {
      const result = await permanentlyDeleteArchive(deleteTarget.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('已永久删除')
        setDeleteTarget(null)
        router.refresh()
      }
    })
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchValue.trim()
    router.push(q ? `/admin/archive?q=${encodeURIComponent(q)}` : '/admin/archive')
  }

  return (
    <div className="space-y-6">
      {/* 搜索栏 */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="搜索文章标题..."
            className="w-full pl-10 pr-3 py-2 rounded-md border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button type="submit" variant="outline" size="sm">搜索</Button>
        {search && (
          <Button type="button" variant="ghost" size="sm" onClick={() => { setSearchValue(''); router.push('/admin/archive') }}>
            清除
          </Button>
        )}
      </form>

      {/* 统计 */}
      <div className="text-sm text-muted-foreground">
        共 {total} 篇归档文章{search ? `（搜索"${search}"）` : ''}
      </div>

      {/* 列表 */}
      {archives.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Archive className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>{search ? '没有找到匹配的归档文章' : '暂无归档文章'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {archives.map((post) => (
            <div
              key={post.id}
              className="flex items-center gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{post.title}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span>作者: {post.author_name ?? '未知'}</span>
                  <span>原 slug: {post.slug}</span>
                  <span>归档于: {new Date(post.archived_at).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 cursor-pointer"
                  onClick={() => setRestoreTarget(post)}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  恢复
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 cursor-pointer text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(post)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  删除
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => router.push(`/admin/archive?page=${page - 1}${search ? `&q=${encodeURIComponent(search)}` : ''}`)}
          >
            上一页
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => router.push(`/admin/archive?page=${page + 1}${search ? `&q=${encodeURIComponent(search)}` : ''}`)}
          >
            下一页
          </Button>
        </div>
      )}

      {/* 恢复确认弹窗 */}
      <Dialog open={!!restoreTarget} onOpenChange={(o) => { if (!o) setRestoreTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>恢复文章</DialogTitle>
            <DialogDescription>
              确定要恢复「{restoreTarget?.title}」吗？文章将重新出现在公开列表中。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreTarget(null)} disabled={isPending}>
              取消
            </Button>
            <Button onClick={handleRestore} disabled={isPending}>
              {isPending ? '恢复中...' : '确认恢复'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 永久删除确认弹窗 */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>永久删除</DialogTitle>
            <DialogDescription>
              确定要永久删除「{deleteTarget?.title}」吗？此操作不可撤销，文章内容将永久丢失。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isPending}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? '删除中...' : '永久删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
