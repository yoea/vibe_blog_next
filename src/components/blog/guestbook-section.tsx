'use client'

import { useState, useRef, useEffect } from 'react'
import { createGuestbookMessage, deleteGuestbookMessage, getMoreGuestbookMessages } from '@/lib/actions/guestbook-actions'
import { CommentForm } from './comment-form'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { getUserColor } from '@/lib/utils/colors'
import { formatTimeAgo } from '@/lib/utils/time'
import Link from 'next/link'
import type { GuestbookMessageWithAuthor } from '@/lib/db/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const PAGE_SIZE = 10

function GuestbookMessageItem({
  message,
  currentUserId,
  onDelete,
}: {
  message: GuestbookMessageWithAuthor
  currentUserId: string | null
  onDelete: (id: string) => void
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  const [showConfirm, setShowConfirm] = useState(false)

  const displayName = message.author?.display_name ?? message.author_email?.split('@')[0] ?? '匿名用户'

  return (
    <>
      <div className="flex gap-3 pb-3 border-b border-gray-100 last:border-0">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold text-white shrink-0 mt-0.5"
          style={{ backgroundColor: getUserColor(message.author_id) }}
        >
          {displayName[0]}
        </div>
        <div className="flex-1 space-y-1 min-w-0">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <Link href={`/author/${message.author_id}`} className="font-medium hover:underline truncate">
              {displayName}
            </Link>
            <span className="shrink-0 ml-2">{mounted ? formatTimeAgo(message.created_at) : ''}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          {currentUserId === message.author_id && (
            <button
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              删除
            </button>
          )}
        </div>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除留言</DialogTitle>
            <DialogDescription>确定删除这条留言？此操作不可撤销。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={() => { onDelete(message.id); setShowConfirm(false) }}>
              删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function GuestbookSection({
  toAuthorId,
  currentUserId,
  initialMessages,
  initialTotal,
}: {
  toAuthorId: string
  currentUserId: string | null
  initialMessages: GuestbookMessageWithAuthor[]
  initialTotal: number
}) {
  const [messages, setMessages] = useState<GuestbookMessageWithAuthor[]>(initialMessages)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const hasMore = messages.length < total

  async function handleSubmit(content: string) {
    const result = await createGuestbookMessage(toAuthorId, content)
    if (!result.error && result.data) {
      setMessages((prev) => [result.data, ...prev])
      setTotal((c) => c + 1)
      return { success: true }
    }
    return { success: false, error: result.error }
  }

  async function handleDelete(messageId: string) {
    const result = await deleteGuestbookMessage(messageId, toAuthorId)
    if (!result.error) {
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
      setTotal((c) => c - 1)
    }
  }

  async function handleLoadMore() {
    setLoading(true)
    const nextPage = page + 1
    const result = await getMoreGuestbookMessages(toAuthorId, nextPage)
    const newMessages = result.data
    if (newMessages) {
      setMessages((prev) => [...prev, ...newMessages])
      setPage(nextPage)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">留言板</h2>

      <CommentForm
        postId={toAuthorId}
        onSubmit={handleSubmit}
        inputRef={inputRef}
      />

      {messages.length > 0 && (
        <div className="space-y-3">
          {messages.map((message) => (
            <GuestbookMessageItem
              key={message.id}
              message={message}
              currentUserId={currentUserId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" onClick={handleLoadMore} disabled={loading}>
            {loading ? '加载中...' : '加载更多留言'}
          </Button>
        </div>
      )}
    </div>
  )
}
