'use client'

import { useState, type ReactNode } from 'react'
import { CommentForm } from './comment-form'
import Link from 'next/link'
import { MessageCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { getUserColor } from '@/lib/utils/colors'
import { formatTimeAgo } from '@/lib/utils/time'
import { Avatar } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { ThreadedItemBase } from '@/lib/db/types'

interface ThreadedItem extends ThreadedItemBase {
  replies?: this[]
}

export function ThreadedItemRenderer<T extends ThreadedItem>({
  item,
  currentUserId,
  identifier,
  replyTarget,
  onReply,
  onCancelReply,
  onSubmitReply,
  onDelete,
  deleteTitle = '删除',
  deleteDescription = '确定删除？此操作不可撤销。',
  canDelete,
  children,
  renderActions,
}: {
  item: T
  currentUserId: string | null
  identifier: string
  replyTarget?: string | null
  onReply?: (id: string) => void
  onCancelReply?: () => void
  onSubmitReply?: (content: string, parentId?: string) => Promise<{ success: boolean; error?: string }>
  onDelete: (id: string) => Promise<boolean> | boolean
  deleteTitle?: string
  deleteDescription?: string
  canDelete?: boolean
  children?: ReactNode
  renderActions?: (item: T) => ReactNode
}) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isReplyActive = replyTarget === item.id
  const isGuest = !item.author_id
  const displayName = isGuest
    ? (item.author?.display_name ?? '匿名游客')
    : (item.author?.display_name ?? item.author_email?.split('@')[0] ?? '匿名用户')
  const avatarUrl = !isGuest ? (item.author as any)?.avatar_url ?? null : null

  const handleConfirmDelete = async () => {
    setDeleting(true)
    const ok = await onDelete(item.id)
    setDeleting(false)
    if (ok) {
      setShowConfirm(false)
    } else {
      toast.error('删除失败，请重试')
    }
  }

  return (
    <>
      <div className="flex gap-3 pb-3">
        {!isGuest ? (
          <Avatar
            avatarUrl={avatarUrl}
            displayName={displayName}
            userId={item.author_id!}
            size="xs"
            className="mt-0.5"
            defer
          />
        ) : (
          <div className="size-6 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground mt-0.5 shrink-0">
            {displayName[0] ?? '?'}
          </div>
        )}
        <div className="flex-1 space-y-1 min-w-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 truncate">
              {isGuest ? (
                <span className="font-medium truncate" style={{ color: getUserColor('guest') }}>
                  {displayName}
                </span>
              ) : (
                <Link
                  href={`/author/${item.author_id}`}
                  className="font-medium hover:underline truncate"
                  style={{ color: getUserColor(item.author_id!) }}
                >
                  {displayName}
                </Link>
              )}
              {isGuest && (
                <span className="shrink-0 text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground">游客</span>
              )}
            </div>
            <span className="shrink-0 ml-2" suppressHydrationWarning>{formatTimeAgo(item.created_at)}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap break-words">{item.content}</p>

          <div className="flex items-center gap-3 pt-1">
            {renderActions ? renderActions(item) : children}
            {onReply && (
              <button
                onClick={() => onReply(item.id)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                回复
              </button>
            )}
            {(canDelete ?? (currentUserId && currentUserId === item.author_id)) && (
              <button
                onClick={() => setShowConfirm(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                删除
              </button>
            )}
          </div>

          {isReplyActive && onSubmitReply && (
            <div className="mt-3 pl-4 border-l-2 border-muted">
              <CommentForm
                key={item.id}
                postId={identifier}
                onSubmit={onSubmitReply}
                replyTo={{ id: item.id, name: displayName }}
                onCancelReply={onCancelReply}
                currentUserId={currentUserId}
              />
            </div>
          )}
        </div>
      </div>

      {item.replies && item.replies.length > 0 && (
        <div className="ml-8 pl-4 border-l-2 border-muted">
          <ReplyList
            replies={item.replies as unknown as T[]}
            parentAuthorName={displayName}
            currentUserId={currentUserId}
            identifier={identifier}
            replyTarget={replyTarget}
            onReply={onReply}
            onCancelReply={onCancelReply}
            onSubmitReply={onSubmitReply}
            onDelete={onDelete}
            deleteTitle={deleteTitle}
            deleteDescription={deleteDescription}
            canDelete={canDelete}
            renderActions={renderActions}
          />
        </div>
      )}

      <Dialog open={showConfirm} onOpenChange={(open) => { if (!deleting) setShowConfirm(open) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deleteTitle}</DialogTitle>
            <DialogDescription>{deleteDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={deleting}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ReplyList<T extends ThreadedItem>({
  replies,
  parentAuthorName,
  currentUserId,
  identifier,
  replyTarget,
  onReply,
  onCancelReply,
  onSubmitReply,
  onDelete,
  deleteTitle,
  deleteDescription,
  canDelete,
  renderActions,
}: {
  replies: T[]
  parentAuthorName: string
  currentUserId: string | null
  identifier: string
  replyTarget?: string | null
  onReply?: (id: string) => void
  onCancelReply?: () => void
  onSubmitReply?: (content: string, parentId?: string) => Promise<{ success: boolean; error?: string }>
  onDelete: (id: string) => Promise<boolean> | boolean
  deleteTitle?: string
  deleteDescription?: string
  canDelete?: boolean
  renderActions?: (item: T) => ReactNode
}) {
  const [collapsed, setCollapsed] = useState(replies.length > 1)
  const hiddenCount = replies.length - 1

  if (replies.length === 0) return null

  return (
    <>
      <div className="space-y-2 pb-2">
        {/* Always show the first reply */}
        <ReplyItem
          key={replies[0].id}
          reply={replies[0]}
          parentAuthorName={parentAuthorName}
          currentUserId={currentUserId}
          identifier={identifier}
          replyTarget={replyTarget}
          onReply={onReply}
          onCancelReply={onCancelReply}
          onSubmitReply={onSubmitReply}
          onDelete={onDelete}
          deleteTitle={deleteTitle}
          deleteDescription={deleteDescription}
          canDelete={canDelete}
          renderActions={renderActions}
        />
        {hiddenCount > 0 && (
          collapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors py-1"
            >
              <ChevronDown className="h-3.5 w-3.5" />
              展开 {hiddenCount} 条回复
            </button>
          ) : (
            <>
              {replies.slice(1).map((reply) => (
                <ReplyItem
                  key={reply.id}
                  reply={reply}
                  parentAuthorName={parentAuthorName}
                  currentUserId={currentUserId}
                  identifier={identifier}
                  replyTarget={replyTarget}
                  onReply={onReply}
                  onCancelReply={onCancelReply}
                  onSubmitReply={onSubmitReply}
                  onDelete={onDelete}
                  deleteTitle={deleteTitle}
                  deleteDescription={deleteDescription}
                  canDelete={canDelete}
                  renderActions={renderActions}
                />
              ))}
              <button
                onClick={() => setCollapsed(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors pb-1"
              >
                <ChevronUp className="h-3.5 w-3.5" />
                收起回复
              </button>
            </>
          )
        )}
      </div>
    </>
  )
}

function ReplyItem<T extends ThreadedItem>({
  reply,
  parentAuthorName,
  currentUserId,
  identifier,
  replyTarget,
  onReply,
  onCancelReply,
  onSubmitReply,
  onDelete,
  deleteTitle,
  deleteDescription,
  canDelete,
  renderActions,
}: {
  reply: T
  parentAuthorName: string
  currentUserId: string | null
  identifier: string
  replyTarget?: string | null
  onReply?: (id: string) => void
  onCancelReply?: () => void
  onSubmitReply?: (content: string, parentId?: string) => Promise<{ success: boolean; error?: string }>
  onDelete: (id: string) => Promise<boolean> | boolean
  deleteTitle?: string
  deleteDescription?: string
  canDelete?: boolean
  renderActions?: (item: T) => ReactNode
}) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isReplyActive = replyTarget === reply.id
  const isGuest = !reply.author_id
  const displayName = isGuest
    ? (reply.author?.display_name ?? '匿名游客')
    : (reply.author?.display_name ?? reply.author_email?.split('@')[0] ?? '匿名用户')
  const avatarUrl = !isGuest ? (reply.author as any)?.avatar_url ?? null : null

  const handleConfirmDelete = async () => {
    setDeleting(true)
    const ok = await onDelete(reply.id)
    setDeleting(false)
    if (ok) {
      setShowConfirm(false)
    } else {
      toast.error('删除失败，请重试')
    }
  }

  return (
    <>
      <div className="flex gap-3 pb-2 pt-1">
        {!isGuest ? (
          <Avatar
            avatarUrl={avatarUrl}
            displayName={displayName}
            userId={reply.author_id!}
            size="xs"
            className="mt-0.5"
            defer
          />
        ) : (
          <div className="size-6 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground mt-0.5 shrink-0">
            {displayName[0] ?? '?'}
          </div>
        )}
        <div className="flex-1 space-y-1 min-w-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 truncate">
              {isGuest ? (
                <span className="font-medium truncate" style={{ color: getUserColor('guest') }}>
                  {displayName}
                </span>
              ) : (
                <Link
                  href={`/author/${reply.author_id}`}
                  className="font-medium hover:underline truncate"
                  style={{ color: getUserColor(reply.author_id!) }}
                >
                  {displayName}
                </Link>
              )}
            </div>
            <span className="shrink-0 ml-2" suppressHydrationWarning>{formatTimeAgo(reply.created_at)}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap break-words">
            <span className="text-muted-foreground">回复 @{parentAuthorName}：</span>
            {reply.content}
          </p>

          <div className="flex items-center gap-3 pt-1">
            {renderActions ? renderActions(reply) : null}
            {onReply && (
              <button
                onClick={() => onReply(reply.id)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                回复
              </button>
            )}
            {(canDelete ?? (currentUserId && currentUserId === reply.author_id)) && (
              <button
                onClick={() => setShowConfirm(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                删除
              </button>
            )}
          </div>

          {isReplyActive && onSubmitReply && (
            <div className="mt-2 pl-4 border-l-2 border-muted">
              <CommentForm
                key={reply.id}
                postId={identifier}
                onSubmit={onSubmitReply}
                replyTo={{ id: reply.id, name: displayName }}
                onCancelReply={onCancelReply}
                currentUserId={currentUserId}
              />
            </div>
          )}
        </div>
      </div>

      <Dialog open={showConfirm} onOpenChange={(open) => { if (!deleting) setShowConfirm(open) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deleteTitle}</DialogTitle>
            <DialogDescription>{deleteDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={deleting}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
