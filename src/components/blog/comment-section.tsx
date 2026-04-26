'use client'

import { useState } from 'react'
import { createComment } from '@/lib/actions/comment-actions'
import { CommentItem } from './comment-item'
import { CommentForm } from './comment-form'
import type { CommentWithAuthor } from '@/lib/db/types'

export function CommentSection({
  postId,
  postAuthorId,
  currentUserId,
  initialComments,
}: {
  postId: string
  postAuthorId: string
  currentUserId: string | null
  initialComments: CommentWithAuthor[]
}) {
  const [comments, setComments] = useState<CommentWithAuthor[]>(initialComments)
  const [replyTarget, setReplyTarget] = useState<CommentWithAuthor | null>(null)

  async function handleNewComment(content: string, parentId?: string) {
    const result = await createComment(postId, content, parentId)
    if (!result.error && result.data) {
      if (parentId) {
        // Append reply to parent's replies array
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentId
              ? { ...c, replies: [...(c.replies ?? []), result.data] }
              : c
          )
        )
      } else {
        setComments((prev) => [...prev, result.data])
      }
      return { success: true }
    }
    return { success: false, error: result.error }
  }

  function handleDeleteComment(commentId: string) {
    // Remove from top-level or from replies
    setComments((prev) => {
      // Check if it's a top-level comment
      const exists = prev.some((c) => c.id === commentId)
      if (exists) return prev.filter((c) => c.id !== commentId)
      // Remove from replies
      return prev.map((c) => ({
        ...c,
        replies: c.replies?.filter((r) => r.id !== commentId),
      }))
    })
  }

  const totalComments = comments.reduce((sum, c) => sum + 1 + (c.replies?.length ?? 0), 0)

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg flex items-center gap-2">
        评论 ({totalComments})
      </h3>
      {comments.length > 0 && (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="border-b border-gray-100 last:border-0">
              <CommentItem
                comment={comment}
                canDelete={currentUserId === comment.author_id || currentUserId === postAuthorId}
                currentUserId={currentUserId}
                onDelete={handleDeleteComment}
                onReply={(c) => setReplyTarget(c)}
              />
            </div>
          ))}
        </div>
      )}
      <CommentForm
        postId={postId}
        onSubmit={handleNewComment}
        replyTo={replyTarget ? { id: replyTarget.id, name: replyTarget.author?.display_name ?? replyTarget.author_email?.split('@')[0] ?? '匿名用户' } : null}
        onCancelReply={() => setReplyTarget(null)}
      />
    </div>
  )
}
