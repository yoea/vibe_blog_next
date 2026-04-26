'use client'

import { useState, useRef, useEffect } from 'react'
import { createComment, getMoreComments } from '@/lib/actions/comment-actions'
import { deleteComment, toggleCommentLike } from '@/lib/actions/comment-actions'
import { useThreadedList } from './use-threaded-list'
import { ThreadedItemRenderer } from './threaded-item'
import { CommentForm } from './comment-form'
import { Button } from '@/components/ui/button'
import { Heart } from 'lucide-react'
import type { CommentWithAuthor } from '@/lib/db/types'

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
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const {
    items: comments,
    hasMore,
    replyTarget,
    setReplyTarget,
    handleSubmit,
    handleDelete,
    handleLoadMore,
    loading,
  } = useThreadedList<CommentWithAuthor>({
    initialItems: initialComments,
    initialTotal,
    onSubmit: async (content, parentId) => {
      const result = await createComment(postId, content, parentId)
      if (result.error) return { success: false, error: result.error }
      return { success: true, data: result.data }
    },
    onDeleteItem: async (id) => {
      return await deleteComment(id, postId)
    },
    onLoadMore: async (page) => {
      return await getMoreComments(postId, page)
    },
    onCountChange,
    loadedAllText: '已加载全部评论',
  })

  useEffect(() => {
    if (focusSignal && inputRef.current) {
      inputRef.current.focus()
    }
  }, [focusSignal])

  return (
    <div className="space-y-4">
      <CommentForm
        postId={postId}
        onSubmit={handleSubmit}
        replyTo={null}
        inputRef={inputRef}
        currentUserId={currentUserId}
      />

      {comments.length > 0 && (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="border-b border-gray-100 last:border-0">
              <ThreadedItemRenderer
                item={comment}
                currentUserId={currentUserId}
                identifier={postId}
                replyTarget={replyTarget}
                onReply={setReplyTarget}
                onCancelReply={() => setReplyTarget(null)}
                onSubmitReply={handleSubmit}
                onDelete={handleDelete}
                deleteTitle="删除评论"
                deleteDescription="确定删除这条评论？此操作不可撤销。"
                canDelete={currentUserId === comment.author_id || currentUserId === postAuthorId}
              >
                <LikeButton comment={comment} currentUserId={currentUserId} />
              </ThreadedItemRenderer>
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

function LikeButton({ comment, currentUserId }: { comment: CommentWithAuthor; currentUserId: string | null }) {
  const [liked, setLiked] = useState(comment.is_liked)
  const [likeCount, setLikeCount] = useState(comment.like_count)
  const [likeLoading, setLikeLoading] = useState(false)

  async function handleLike(e: React.MouseEvent) {
    e.stopPropagation()
    if (!currentUserId) return
    setLikeLoading(true)
    const result = await toggleCommentLike(comment.id)
    if (!result.error) {
      setLiked(result.liked ?? false)
      setLikeCount((c) => (result.liked ? c + 1 : c - 1))
    }
    setLikeLoading(false)
  }

  return (
    <button
      onClick={handleLike}
      disabled={!currentUserId || likeLoading}
      className={`flex items-center gap-1 text-xs transition-colors ${
        liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-400'
      }`}
    >
      <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-current' : ''}`} />
      点赞 {likeCount > 0 && likeCount}
    </button>
  )
}
