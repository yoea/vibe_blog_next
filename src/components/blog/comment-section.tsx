'use client'

import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createComment, getMoreComments } from '@/lib/actions/comment-actions'
import { deleteComment, toggleCommentLike } from '@/lib/actions/comment-actions'
import { toast } from 'sonner'
import { useThreadedList } from './use-threaded-list'
import { ThreadedItemRenderer } from './threaded-item'
import { CommentForm } from './comment-form'
import { Heart } from 'lucide-react'
import { LoadMore } from '@/components/shared/load-more'
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
  const searchParams = useSearchParams()
  const [highlightId, setHighlightId] = useState<string | null>(searchParams.get('hl'))

  const {
    items: comments,
    total,
    hasMore,
    remainingTopLevel,
    replyTarget,
    setReplyTarget,
    handleSubmit,
    handleDelete,
    handleLoadMore,
    loading,
  } = useThreadedList<CommentWithAuthor>({
    initialItems: initialComments,
    initialTotal,
    onSubmit: async (content, parentId, guestName) => {
      const result = await createComment(postId, content, parentId, guestName)
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
    if (!highlightId) return
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(`comment-${highlightId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => setHighlightId(null), 2500)
      } else {
        toast.error('该评论已删除')
        setHighlightId(null)
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [highlightId])

  useEffect(() => {
    if (focusSignal && inputRef.current) {
      inputRef.current.focus()
    }
  }, [focusSignal])

  return (
    <div id="comments" className="space-y-4">
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
            <div
              key={comment.id}
              id={`comment-${comment.id}`}
              className={`border-b border-gray-100 last:border-0 transition-all duration-500 ${highlightId === comment.id ? 'highlight-flash -mx-3 px-3 rounded-lg' : ''}`}
            >
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
                canDelete={!!currentUserId && (currentUserId === comment.author_id || currentUserId === postAuthorId)}
                renderActions={(item) => <LikeButton comment={item as CommentWithAuthor} currentUserId={currentUserId} />}
                highlightId={highlightId}
              />
            </div>
          ))}
        </div>
      )}

      <LoadMore
        hasMore={hasMore}
        loading={loading}
        onLoadMore={handleLoadMore}
        remaining={remainingTopLevel}
        idleText="加载更多评论"
        loadedAllText="已显示全部评论"
      />
    </div>
  )
}

function LikeButton({ comment }: { comment: CommentWithAuthor; currentUserId: string | null }) {
  const [liked, setLiked] = useState(comment.is_liked)
  const [likeCount, setLikeCount] = useState(comment.like_count)
  const [likeLoading, setLikeLoading] = useState(false)
  const [ip, setIp] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/my-ip')
      .then((r) => r.json())
      .then((data) => setIp(data.ip))
      .catch(() => setIp('unknown'))
  }, [])

  async function handleLike(e: React.MouseEvent) {
    e.stopPropagation()
    setLikeLoading(true)
    const result = await toggleCommentLike(comment.id, ip ?? undefined)
    if (!result.error) {
      setLiked(result.liked ?? false)
      setLikeCount((c) => (result.liked ? c + 1 : c - 1))
    } else {
      toast.error(result.error)
    }
    setLikeLoading(false)
  }

  return (
    <button
      onClick={handleLike}
      disabled={likeLoading}
      className={`flex items-center gap-1 text-xs transition-colors ${
        liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-400'
      }`}
    >
      <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-current' : ''}`} />
      点赞 {likeCount > 0 && likeCount}
    </button>
  )
}
