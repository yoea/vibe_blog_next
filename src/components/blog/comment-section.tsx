'use client'

import { useState, useRef, useEffect } from 'react'
import { createComment, getMoreComments } from '@/lib/actions/comment-actions'
import { CommentItem } from './comment-item'
import { CommentForm } from './comment-form'
import { Button } from '@/components/ui/button'
import type { CommentWithAuthor } from '@/lib/db/types'

const PAGE_SIZE = 10

export function CommentSection({
  postId,
  postAuthorId,
  currentUserId,
  initialComments,
  initialTotal,
  onCountChange,
  focusSignal,
}: {
  postId: string
  postAuthorId: string
  currentUserId: string | null
  initialComments: CommentWithAuthor[]
  initialTotal: number
  onCountChange?: (count: number) => void
  focusSignal?: number
}) {
  const [comments, setComments] = useState<CommentWithAuthor[]>(initialComments)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [replyTarget, setReplyTarget] = useState<CommentWithAuthor | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const hasMore = comments.length < total

  async function handleNewComment(content: string, parentId?: string) {
    const result = await createComment(postId, content, parentId)
    if (!result.error && result.data) {
      setReplyTarget(null)
      let newTotal = 0
      if (parentId) {
        setComments((prev) => {
          const isTopLevel = prev.some((c) => c.id === parentId)
          const next = isTopLevel
            ? prev.map((c) =>
                c.id === parentId ? { ...c, replies: [...(c.replies ?? []), result.data] } : c
              )
            : prev.map((c) =>
                c.replies?.some((r) => r.id === parentId)
                  ? { ...c, replies: [...(c.replies ?? []), result.data] }
                  : c
              )
          newTotal = next.reduce((sum, c) => sum + 1 + (c.replies?.length ?? 0), 0)
          return next
        })
      } else {
        setComments((prev) => {
          const next = [result.data, ...prev]
          newTotal = next.reduce((sum, c) => sum + 1 + (c.replies?.length ?? 0), 0)
          return next
        })
        setTotal((c) => c + 1)
      }
      onCountChange?.(newTotal)
      return { success: true }
    }
    return { success: false, error: result.error }
  }

  function handleDeleteComment(commentId: string) {
    let newTotal = 0
    setComments((prev) => {
      const exists = prev.some((c) => c.id === commentId)
      const next = exists
        ? prev.filter((c) => c.id !== commentId)
        : prev.map((c) => ({ ...c, replies: c.replies?.filter((r) => r.id !== commentId) }))
      newTotal = next.reduce((sum, c) => sum + 1 + (c.replies?.length ?? 0), 0)
      return next
    })
    onCountChange?.(newTotal)
  }

  async function handleLoadMore() {
    setLoading(true)
    const nextPage = page + 1
    const result = await getMoreComments(postId, nextPage)
    if (result.data) {
      setComments((prev) => [...prev, ...result.data!])
      setPage(nextPage)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (focusSignal && inputRef.current) {
      inputRef.current.focus()
    }
  }, [focusSignal])

  return (
    <div className="space-y-4">
      <CommentForm
        postId={postId}
        onSubmit={handleNewComment}
        replyTo={null}
        inputRef={inputRef}
      />

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
                replyTarget={replyTarget}
                onCancelReply={() => setReplyTarget(null)}
                onSubmitReply={handleNewComment}
                postId={postId}
              />
            </div>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" onClick={handleLoadMore} disabled={loading}>
            {loading ? '加载中...' : '加载更多评论'}
          </Button>
        </div>
      )}
    </div>
  )
}
