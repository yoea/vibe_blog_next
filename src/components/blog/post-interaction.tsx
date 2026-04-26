'use client'

import { useState } from 'react'
import { LikeButton } from '@/components/blog/like-button'
import { CommentSection } from '@/components/blog/comment-section'
import { Button } from '@/components/ui/button'
import { MessageCircle } from 'lucide-react'
import type { CommentWithAuthor } from '@/lib/db/types'

export function PostInteraction({
  postId,
  postAuthorId,
  currentUserId,
  initialLikeCount,
  isLiked,
  initialCommentCount,
  initialComments,
  initialTotal,
  editButton,
}: {
  postId: string
  postAuthorId: string
  currentUserId: string | null
  initialLikeCount: number
  isLiked: boolean
  initialCommentCount: number
  initialComments: CommentWithAuthor[]
  initialTotal: number
  editButton?: React.ReactNode
}) {
  const [commentCount, setCommentCount] = useState(initialCommentCount)
  const [focusSignal, setFocusSignal] = useState(0)

  return (
    <>
      <div className="flex items-center gap-4 pt-2 mb-6">
        <LikeButton postId={postId} initialCount={initialLikeCount} isLiked={isLiked} />
        <Button variant="outline" size="sm" className="gap-1.5 cursor-pointer" onClick={() => setFocusSignal((c) => c + 1)}>
          <MessageCircle className="h-4 w-4" />
          <span>{commentCount}</span>
        </Button>
        {editButton && <div className="ml-auto">{editButton}</div>}
      </div>

      <CommentSection
        postId={postId}
        postAuthorId={postAuthorId}
        currentUserId={currentUserId}
        initialComments={initialComments}
        initialTotal={initialTotal}
        onCountChange={setCommentCount}
        focusSignal={focusSignal}
      />
    </>
  )
}
