'use client'

import { useState, useRef, useEffect } from 'react'
import { createGuestbookMessage, deleteGuestbookMessage, getMoreGuestbookMessages } from '@/lib/actions/guestbook-actions'
import { useThreadedList } from './use-threaded-list'
import { ThreadedItemRenderer } from './threaded-item'
import { CommentForm } from './comment-form'
import { Button } from '@/components/ui/button'
import type { GuestbookMessageWithAuthor } from '@/lib/db/types'

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
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const {
    items: messages,
    hasMore,
    replyTarget,
    setReplyTarget,
    handleSubmit,
    handleDelete,
    handleLoadMore,
    loading,
  } = useThreadedList<GuestbookMessageWithAuthor>({
    initialItems: initialMessages,
    initialTotal,
    onSubmit: async (content, parentId) => {
      const result = await createGuestbookMessage(toAuthorId, content, parentId)
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

  return (
    <div id="guestbook" className="space-y-4">
      <h2 className="text-xl font-bold">留言板</h2>

      <CommentForm
        postId={toAuthorId}
        onSubmit={handleSubmit}
        inputRef={inputRef}
        currentUserId={currentUserId}
      />

      {messages.length > 0 && (
        <div className="space-y-3">
          {messages.map((message) => (
            <div key={message.id} className="border-b border-gray-100 last:border-0">
              <ThreadedItemRenderer
                item={message}
                currentUserId={currentUserId}
                identifier={toAuthorId}
                replyTarget={replyTarget}
                onReply={setReplyTarget}
                onCancelReply={() => setReplyTarget(null)}
                onSubmitReply={handleSubmit}
                onDelete={handleDelete}
                deleteTitle="删除留言"
                deleteDescription="确定删除这条留言？此操作不可撤销。"
              />
            </div>
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
