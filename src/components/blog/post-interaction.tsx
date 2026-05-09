'use client';

import { useState, useEffect } from 'react';
import { LikeButton } from '@/components/blog/like-button';
import { CommentSection } from '@/components/blog/comment-section';
import { ShareDialog } from '@/components/blog/share-dialog';
import { Button } from '@/components/ui/button';
import { MessageCircle, Share2 } from 'lucide-react';
import type { CommentWithAuthor } from '@/lib/db/types';

interface PostActionBarProps {
  postId: string;
  initialLikeCount: number;
  isLiked: boolean;
  commentCount: number;
  onCommentClick?: () => void;
  shareUrl?: string;
  published?: boolean;
  editButton?: React.ReactNode;
  archiveButton?: React.ReactNode;
}

export function PostActionBar({
  postId,
  initialLikeCount,
  isLiked,
  commentCount,
  onCommentClick,
  shareUrl,
  published,
  editButton,
  archiveButton,
}: PostActionBarProps) {
  const [showShare, setShowShare] = useState(false);
  const [shareCount, setShareCount] = useState(0);

  useEffect(() => {
    fetch(`/api/shares?postId=${postId}`)
      .then((r) => r.json())
      .then((data) => setShareCount(data.count ?? 0))
      .catch(() => {});
  }, [postId]);

  const handleShareClick = () => {
    if (published === false) return;
    fetch('/api/shares', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId }),
    }).catch(() => {});
    setShareCount((c) => c + 1);

    if (
      /Mobi|Android|iPhone|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) &&
      navigator.share &&
      shareUrl
    ) {
      navigator.share({ title: document.title, url: shareUrl }).catch(() => {});
      return;
    }

    setShowShare(true);
  };

  return (
    <>
      <div className="flex items-center gap-4 pt-2 mb-6">
        <LikeButton
          postId={postId}
          initialCount={initialLikeCount}
          isLiked={isLiked}
        />
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 cursor-pointer"
          data-testid="post-comment-btn"
          onClick={() => {
            if (onCommentClick) {
              onCommentClick();
            } else {
              const el = document.getElementById('comments');
              el?.scrollIntoView({ behavior: 'smooth' });
              setTimeout(() => {
                const textarea = el?.querySelector('textarea');
                textarea?.focus();
              }, 400);
            }
          }}
        >
          <MessageCircle className="h-4 w-4" />
          <span>{commentCount}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 cursor-pointer"
          disabled={published === false}
          title={published === false ? '私密文章不可分享' : '分享'}
          data-testid="post-share-btn"
          onClick={handleShareClick}
        >
          <Share2
            className={`h-4 w-4 ${published === false ? 'opacity-40' : ''}`}
          />
          <span>{shareCount}</span>
        </Button>
        {(editButton || archiveButton) && (
          <div className="ml-auto flex items-center gap-2">
            {editButton}
            {archiveButton}
          </div>
        )}
      </div>

      {shareUrl && (
        <ShareDialog
          open={showShare}
          onOpenChange={setShowShare}
          url={shareUrl}
        />
      )}
    </>
  );
}

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
  archiveButton,
}: {
  postId: string;
  postAuthorId: string;
  currentUserId: string | null;
  initialLikeCount: number;
  isLiked: boolean;
  initialCommentCount: number;
  initialComments: CommentWithAuthor[];
  initialTotal: number;
  shareUrl?: string;
  published?: boolean;
  editButton?: React.ReactNode;
  archiveButton?: React.ReactNode;
}) {
  const [commentCount, setCommentCount] = useState(initialCommentCount);
  const [focusSignal, setFocusSignal] = useState(0);

  return (
    <>
      <PostActionBar
        postId={postId}
        initialLikeCount={initialLikeCount}
        isLiked={isLiked}
        commentCount={commentCount}
        onCommentClick={() => setFocusSignal((c) => c + 1)}
        shareUrl={shareUrl}
        published={published}
        editButton={editButton}
        archiveButton={archiveButton}
      />

      <CommentSection
        postId={postId}
        postAuthorId={postAuthorId}
        currentUserId={currentUserId}
        initialComments={initialComments}
        initialTotal={initialTotal}
        onCountChange={(delta) => setCommentCount((c) => c + delta)}
        focusSignal={focusSignal}
      />
    </>
  );
}
