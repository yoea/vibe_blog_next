'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { CommentForm } from './comment-form'
import Link from 'next/link'
import { MessageCircle, Trash2 } from 'lucide-react'
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
}: {
  item: T
  currentUserId: string | null
  identifier: string
  replyTarget?: string | null
  onReply?: (id: string) => void
  onCancelReply?: () => void
  onSubmitReply?: (content: string, parentId?: string) => Promise<{ success: boolean; error?: string }>
  onDelete: (id: string) => void
  deleteTitle?: string
  deleteDescription?: string
  canDelete?: boolean
  children?: ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const [showConfirm, setShowConfirm] = useState(false)

  const isReplyActive = replyTarget === item.id
  const displayName = item.author?.display_name ?? item.author_email?.split('@')[0] ?? '匿名用户'

  return (
    <>
      <div className="flex gap-3 pb-3">
        <div className="flex-1 space-y-1 min-w-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <Link
              href={`/author/${item.author_id}`}
              className="font-medium hover:underline truncate"
              style={{ color: getUserColor(item.author_id) }}
            >
              {displayName}
            </Link>
            <span className="shrink-0 ml-2">{mounted ? formatTimeAgo(item.created_at) : ''}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap break-words">{item.content}</p>

          <div className="flex items-center gap-3 pt-1">
            {children}
            {currentUserId && onReply && (
              <button
                onClick={() => onReply(item.id)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                回复
              </button>
            )}
            {(canDelete ?? currentUserId === item.author_id) && (
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
              />
            </div>
          )}
        </div>
      </div>

      {item.replies && item.replies.length > 0 && (
        <div className="ml-8 pl-4 border-l-2 border-muted space-y-2 pb-2">
          {item.replies.map((reply) => (
            <ThreadedItemRenderer
              key={reply.id}
              item={reply as unknown as T}
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
              children={children}
            />
          ))}
        </div>
      )}

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deleteTitle}</DialogTitle>
            <DialogDescription>{deleteDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => { onDelete(item.id); setShowConfirm(false) }}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
