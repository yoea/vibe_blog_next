'use client'

import { useState } from 'react'
import { LikeButton } from '@/components/blog/like-button'
import { CommentSection } from '@/components/blog/comment-section'
import { ShareDialog } from '@/components/blog/share-dialog'
import { Button } from '@/components/ui/button'
import { MessageCircle, Share2 } from 'lucide-react'
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
  shareUrl,
  published,
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
  shareUrl?: string
  published?: boolean
  editButton?: React.ReactNode
}) {
  const [commentCount, setCommentCount] = useState(initialCommentCount)
  const [focusSignal, setFocusSignal] = useState(0)
  const [showShare, setShowShare] = useState(false)

  return (
    <>
      <div className="flex items-center gap-4 pt-2 mb-6">
        <LikeButton postId={postId} initialCount={initialLikeCount} isLiked={isLiked} />
        <Button variant="outline" size="sm" className="gap-1.5 cursor-pointer" onClick={() => setFocusSignal((c) => c + 1)}>
          <MessageCircle className="h-4 w-4" />
          <span>{commentCount}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 cursor-pointer"
          disabled={published === false}
          title={published === false ? '私密文章不可分享' : '分享'}
          onClick={() => setShowShare(true)}
        >
          <Share2 className={`h-4 w-4 ${published === false ? 'opacity-40' : ''}`} />
        </Button>
        {editButton && <div className="ml-auto">{editButton}</div>}
      </div>

      {shareUrl && (
        <ShareDialog
          open={showShare}
          onOpenChange={setShowShare}
          url={shareUrl}
        />
      )}

      <CommentSection
        postId={postId}
        postAuthorId={postAuthorId}
        currentUserId={currentUserId}
        initialComments={initialComments}
        initialTotal={initialTotal}
        onCountChange={(delta) => setCommentCount(c => c + delta)}
        focusSignal={focusSignal}
      />
    </>
  )
}
