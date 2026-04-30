'use client'

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { createGuestbookMessage, deleteGuestbookMessage, getMoreGuestbookMessages } from '@/lib/actions/guestbook-actions'
import { useThreadedList } from './use-threaded-list'
import { ThreadedItemRenderer } from './threaded-item'
import { CommentForm } from './comment-form'
import type { GuestbookMessageWithAuthor } from '@/lib/db/types'
import { LoadMore } from '@/components/shared/load-more'

export function GuestbookSection({
  toAuthorId,
  currentUserId,
  initialMessages,
  initialTotal,
  title = '留言板',
  icon,
  showForm = true,
  messagesPublic = true,
}: {
  toAuthorId: string
  currentUserId: string | null
  initialMessages: GuestbookMessageWithAuthor[]
  initialTotal: number
  title?: string
  icon?: ReactNode
  showForm?: boolean
  /** true=所有人可见(默认)；false=仅留言者本人和作者可见 */
  messagesPublic?: boolean
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const searchParams = useSearchParams()
  const [highlightId, setHighlightId] = useState<string | null>(searchParams.get('hl'))

  const {
    items: messages,
    total,
    hasMore,
    remainingTopLevel,
    replyTarget,
    setReplyTarget,
    handleSubmit,
    handleDelete,
    handleLoadMore,
    loading,
  } = useThreadedList<GuestbookMessageWithAuthor>({
    initialItems: initialMessages,
    initialTotal,
    onSubmit: async (content, parentId, guestName) => {
      const result = await createGuestbookMessage(toAuthorId, content, parentId, guestName)
      if (result.error) return { success: false, error: result.error }
      return { success: true, data: result.data }
    },
    onDeleteItem: async (id) => {
      return await deleteGuestbookMessage(id, toAuthorId)
    },
    onLoadMore: async (page) => {
      return await getMoreGuestbookMessages(toAuthorId, page)
    },
    loadedAllText: '已加载全部留言',
  })

  useEffect(() => {
    if (!highlightId) return
    // 等待一帧确保折叠的回复已展开到 DOM
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(`guestbook-msg-${highlightId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => setHighlightId(null), 2500)
      } else {
        toast.error('该留言已删除')
        setHighlightId(null)
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [highlightId])

  useEffect(() => {
    const onHashChange = () => {
      if (window.location.hash === '#guestbook') {
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    }
    if (window.location.hash === '#guestbook') {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const isOwner = currentUserId === toAuthorId
  const visibleMessages = messagesPublic
    ? messages
    : messages.filter((m) => isOwner || currentUserId === m.author_id)

  return (
    <div id="guestbook" className="space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-xl font-bold">{title}</h2>
      </div>

      {showForm && (
        <CommentForm
          postId={toAuthorId}
          onSubmit={handleSubmit}
          inputRef={inputRef}
          currentUserId={currentUserId}
        />
      )}

      {visibleMessages.length > 0 && (
        <div className="space-y-3">
          {visibleMessages.map((message) => (
            <div
              key={message.id}
              id={`guestbook-msg-${message.id}`}
              className={`border-b border-gray-100 last:border-0 rounded-md ${highlightId === message.id ? 'highlight-flash' : ''}`}
            >
              <ThreadedItemRenderer
                item={message}
                currentUserId={currentUserId}
                identifier={toAuthorId}
                replyTarget={replyTarget}
                onReply={setReplyTarget}
                onCancelReply={() => setReplyTarget(null)}
                onSubmitReply={handleSubmit}
                onDelete={handleDelete}
                canDelete={currentUserId !== null && (currentUserId === message.author_id || currentUserId === toAuthorId)}
                deleteTitle="删除留言"
                deleteDescription="确定删除这条留言？此操作不可撤销。"
                highlightId={highlightId}
                idPrefix="guestbook-msg"
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
        idleText="加载更多留言"
        loadedAllText="已显示全部留言"
      />
    </div>
  )
}
