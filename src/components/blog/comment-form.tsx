'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const MAX_COMMENT_LENGTH = 500

export function CommentForm({
  postId,
  onSubmit,
  replyTo,
  onCancelReply,
}: {
  postId: string
  onSubmit: (content: string, parentId?: string) => Promise<{ success: boolean; error?: string }>
  replyTo?: { id: string; name: string } | null
  onCancelReply?: () => void
}) {
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [autoFocus, setAutoFocus] = useState(false)

  useEffect(() => {
    if (replyTo) setAutoFocus(true)
  }, [replyTo])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
        autoFocus={autoFocus}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={replyTo ? `回复 ${replyTo.name}...` : '写下你的评论...'}
        rows={3}
        maxLength={MAX_COMMENT_LENGTH}
      />
      <div className="flex items-center justify-between">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <p className="text-xs text-muted-foreground ml-auto">
          {comment.length}/{MAX_COMMENT_LENGTH}
        </p>
      </div>
      <Button type="submit" disabled={submitting || !comment.trim() || comment.trim().length > MAX_COMMENT_LENGTH} size="sm">
        {submitting ? '提交中...' : replyTo ? '回复' : '发表评论'}
      </Button>
    </form>
  )
}
