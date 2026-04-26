'use client'

import { useState } from 'react'
import { deleteComment, toggleCommentLike } from '@/lib/actions/comment-actions'
import type { CommentWithAuthor } from '@/lib/db/types'
import Link from 'next/link'
import { Trash2, Heart, MessageCircle } from 'lucide-react'
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
  currentUserId,
  onDelete,
  onReply,
}: {
  comment: CommentWithAuthor
  canDelete: boolean
  currentUserId: string | null
  onDelete: (commentId: string) => void
  onReply: (comment: CommentWithAuthor) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [liked, setLiked] = useState(comment.is_liked)
  const [likeCount, setLikeCount] = useState(comment.like_count)
  const [likeLoading, setLikeLoading] = useState(false)

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

  async function handleLike() {
    if (!currentUserId) return
    setLikeLoading(true)
    const result = await toggleCommentLike(comment.id)
    if (!result.error) {
      setLiked(result.liked ?? false)
      setLikeCount((c) => result.liked ? c + 1 : c - 1)
    }
    setLikeLoading(false)
  }

  const displayName = comment.author?.display_name ?? comment.author_email?.split('@')[0] ?? '匿名用户'

  return (
    <>
      <div className="flex gap-3 pb-3">
        <div className="flex-1 space-y-1 min-w-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <Link href={`/author/${comment.author_id}`} className="font-medium hover:underline truncate" style={{ color: getUserColor(comment.author_id) }}>
              {displayName}
            </Link>
            <span className="shrink-0 ml-2">{formatTimeAgo(comment.created_at)}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-1">
            {currentUserId && (
              <button onClick={() => onReply(comment)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                <MessageCircle className="h-3.5 w-3.5" />
                回复
              </button>
            )}
            <button onClick={handleLike} disabled={!currentUserId || likeLoading}
              className={`flex items-center gap-1 text-xs transition-colors ${
                liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-400'
              }`}>
              <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-current' : ''}`} />
              {likeCount > 0 && likeCount}
            </button>
            {canDelete && (
              <button onClick={() => setShowConfirm(true)} disabled={deleting}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
                删除
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-8 pl-4 border-l-2 border-muted space-y-2 pb-2">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              canDelete={currentUserId === reply.author_id || canDelete}
              currentUserId={currentUserId}
              onDelete={onDelete}
              onReply={onReply}
            />
          ))}
        </div>
      )}

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
