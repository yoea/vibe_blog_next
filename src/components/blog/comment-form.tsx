'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const MAX_COMMENT_LENGTH = 500

export function CommentForm({
  postId,
  onSubmit,
  replyTo,
  onCancelReply,
  inputRef,
}: {
  postId: string
  onSubmit: (content: string, parentId?: string) => Promise<{ success: boolean; error?: string }>
  replyTo?: { id: string; name: string } | null
  onCancelReply?: () => void
  inputRef?: React.RefObject<HTMLTextAreaElement | null>
}) {
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e?: { preventDefault?: () => void }) => {
    e?.preventDefault?.()
    if (!comment.trim()) return
    if (comment.trim().length > MAX_COMMENT_LENGTH) return

    setSubmitting(true)
    setError('')
    const result = await onSubmit(comment.trim(), replyTo?.id)
    if (result.success) {
      setComment('')
      onCancelReply?.()
    } else {
      setError(result.error === '未登录' ? '请先登录后再评论' : '评论失败，请重试')
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
            键入评论后按 {typeof window !== 'undefined' && navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Enter 发送
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
