'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createTag, deleteTag } from '@/lib/actions/post-actions'
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
import { Plus, Trash2, Hash, Calendar, User } from 'lucide-react'
import type { TagWithCreator } from '@/lib/db/queries'

interface Props {
  initialTags: TagWithCreator[]
  currentUserId: string | null
}

export function TagManager({ initialTags, currentUserId }: Props) {
  const [tags, setTags] = useState(initialTags)
  const [showCreate, setShowCreate] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<TagWithCreator | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleCreate = () => {
    const name = newTagName.trim()
    if (!name) { toast.error('请输入标签名'); return }

    startTransition(async () => {
      const result = await createTag(name)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('标签已创建')
        setShowCreate(false)
        setNewTagName('')
        router.refresh()
      }
    })
  }

  const handleDelete = () => {
    if (!deleteTarget) return

    startTransition(async () => {
      const result = await deleteTag(deleteTarget.id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('标签已删除')
        setTags((prev) => prev.filter((t) => t.id !== deleteTarget.id))
        setDeleteTarget(null)
        router.refresh()
      }
    })
  }

  if (!tags.length) {
    return (
      <div className="space-y-4">
        {currentUserId && (
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" />
              新建标签
            </Button>
          </div>
        )}
        <div className="text-center py-12 text-muted-foreground">
          <p>暂无标签</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {currentUserId && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            新建标签
          </Button>
        </div>
      )}

      <div className="border rounded-lg divide-y">
        {tags.map((tag) => {
          const isOwner = currentUserId === tag.created_by
          return (
            <div key={tag.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded shrink-0"
                  style={{ color: tag.color, backgroundColor: tag.color + '18' }}
                >
                  {tag.name}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                  <Hash className="h-3 w-3" />
                  {tag.post_count}
                </span>
                {tag.author_name || tag.author_email ? (
                  <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                    <User className="h-3 w-3" />
                    {tag.author_name ?? tag.author_email}
                  </span>
                ) : null}
              </div>
              <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(tag.created_at).toLocaleDateString('zh-CN')}
              </span>
              {isOwner && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => setDeleteTarget(tag)}
                  title="删除标签"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )
        })}
      </div>

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建标签</DialogTitle>
            <DialogDescription>输入新标签的名称</DialogDescription>
          </DialogHeader>
          <input
            autoFocus
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') setShowCreate(false)
            }}
            placeholder="标签名"
            maxLength={50}
            className="w-full px-3 py-2 rounded-md border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={isPending}>
              取消
            </Button>
            <Button onClick={handleCreate} disabled={isPending || !newTagName.trim()}>
              {isPending ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除标签</DialogTitle>
            <DialogDescription>
              确定删除标签「{deleteTarget?.name}」？此操作将从所有包含此标签的文章中移除该标签，不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isPending}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? '删除中...' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
