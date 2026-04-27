'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const MAX_COMMENT_LENGTH = 500

export function CommentForm({
  postId,
  onSubmit,
  replyTo,
  onCancelReply,
  inputRef,
  currentUserId,
}: {
  postId: string
  onSubmit: (content: string, parentId?: string, guestName?: string) => Promise<{ success: boolean; error?: string }>
  replyTo?: { id: string; name: string } | null
  onCancelReply?: () => void
  inputRef?: React.RefObject<HTMLTextAreaElement | null>
  currentUserId?: string | null
}) {
  const [comment, setComment] = useState('')
  const [guestName, setGuestName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isMac, setIsMac] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setIsMac(navigator.platform.includes('Mac'))
    const saved = localStorage.getItem('guest_name')
    if (saved) setGuestName(saved)
    setMounted(true)
  }, [])

  const handleSubmit = async (e?: { preventDefault?: () => void }) => {
    e?.preventDefault?.()
    if (!comment.trim()) return
    if (comment.trim().length > MAX_COMMENT_LENGTH) return

    setSubmitting(true)
    setError('')
    const name = !currentUserId ? (guestName.trim() || '匿名游客') : undefined
    const result = await onSubmit(comment.trim(), replyTo?.id, name)
    if (result.success) {
      setComment('')
      if (name) localStorage.setItem('guest_name', name)
      onCancelReply?.()
    } else {
      setError(result.error || '操作失败，请重试')
    }
    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {replyTo && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>回复 <strong>{replyTo.name}</strong></span>
          <button type="button" onClick={onCancelReply} className="text-primary hover:underline">取消回复</button>
        </div>
      )}
      {!currentUserId && (
        <div className="space-y-1">
          {mounted && (
            <label className="text-[11px] text-muted-foreground">
              昵称（设置后将自动保存）
            </label>
          )}
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            onBlur={() => { if (guestName.trim()) localStorage.setItem('guest_name', guestName.trim()) }}
            placeholder="输入昵称（可选）"
            maxLength={50}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-[16px] sm:text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}
      <Textarea
        ref={inputRef}
        autoFocus={!!replyTo}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            handleSubmit(e)
          }
        }}
        placeholder={replyTo ? `回复 ${replyTo.name}...` : '写下你的评论...'}
        rows={3}
        maxLength={MAX_COMMENT_LENGTH}
      />
      <div className="flex items-center justify-between gap-2">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            键入评论后按 {isMac ? 'Cmd' : 'Ctrl'}+Enter 发送
          </p>
        )}
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">
            {comment.length}/{MAX_COMMENT_LENGTH}
          </p>
          <Button type="submit" disabled={submitting || !comment.trim() || comment.trim().length > MAX_COMMENT_LENGTH} size="sm">
            {submitting ? '提交中...' : replyTo ? '回复' : '发表'}
          </Button>
        </div>
      </div>
    </form>
  )
}
