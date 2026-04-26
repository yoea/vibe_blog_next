'use client'

import { useState } from 'react'
import { deleteComment } from '@/lib/actions/comment-actions'
import type { CommentWithAuthor } from '@/lib/db/types'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { getUserColor } from '@/lib/utils/colors'
import { formatTimeAgo } from '@/lib/utils/time'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function CommentItem({
  comment,
  canDelete,
  onDelete,
}: {
  comment: CommentWithAuthor
  canDelete: boolean
  onDelete: (commentId: string) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      const result = await deleteComment(comment.id, comment.post_id)
      if (result.error) {
        alert(result.error)
        setDeleting(false)
      } else {
        onDelete(comment.id)
      }
    } catch {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="flex gap-3 border-b border-gray-100 pb-3 last:border-0">
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <Link href={`/author/${comment.author_id}`} className="font-medium hover:underline" style={{ color: getUserColor(comment.author_id) }}>
              {comment.author?.display_name ?? comment.author_email?.split('@')[0] ?? '匿名用户'}
            </Link>
            <span>{formatTimeAgo(comment.created_at)}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap break-all">{comment.content}</p>
        </div>
        {canDelete && (
          <button
            onClick={() => setShowConfirm(true)}
            disabled={deleting}
            className="text-muted-foreground hover:text-destructive transition-colors self-start shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除评论</DialogTitle>
            <DialogDescription>确定删除这条评论？此操作不可撤销。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={deleting}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? '删除中...' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
