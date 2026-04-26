'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { MarkdownPreview } from '@/components/shared/markdown-preview'
import { Separator } from '@/components/ui/separator'
import { savePost } from '@/lib/actions/post-actions'
import { toast } from 'sonner'
import type { PostWithAuthor } from '@/lib/db/types'

const CONTENT_MAX_LENGTH = 50000
const CONTENT_MAX_ALERT = CONTENT_MAX_LENGTH * 0.95
const SUMMARY_COOLDOWN_MS = 10000
const SUMMARY_MAX_LENGTH = 140
const SUMMARY_MIN_CONTENT_LENGTH = 100

interface Props {
  initialData?: PostWithAuthor
}

export function PostEditor({ initialData }: Props) {
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const [fullscreen, setFullscreen] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [content, setContent] = useState(initialData?.content ?? '')
  const [published, setPublished] = useState(initialData?.published ?? false)
  const [excerpt, setExcerpt] = useState(initialData?.excerpt ?? '')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryCooldown, setSummaryCooldown] = useState(false)
  const [modelName, setModelName] = useState('')
  const lastSummaryTime = useRef(0)
  const router = useRouter()
  const isEditing = !!initialData

  useEffect(() => {
    fetch('/api/generate-summary')
      .then(r => r.json())
      .then(data => setModelName(data.modelName))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen])

  const contentLength = content.trim().length
  const canGenerateSummary = contentLength >= SUMMARY_MIN_CONTENT_LENGTH

  const handleGenerateSummary = useCallback(async () => {
    if (!canGenerateSummary) {
      toast.warning(`正文内容不足，还需 ${SUMMARY_MIN_CONTENT_LENGTH - contentLength} 字`)
      return
    }

    const now = Date.now()
    const elapsed = now - lastSummaryTime.current
    if (elapsed < SUMMARY_COOLDOWN_MS) {
      return
    }

    lastSummaryTime.current = now
    setSummaryLoading(true)
    setSummaryCooldown(true)

    try {
      const res = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '生成摘要失败')
      } else {
        setExcerpt(data.summary.slice(0, SUMMARY_MAX_LENGTH))
        setModelName(data.modelName)
      }
    } catch {
      setError('网络异常，请稍后重试')
    } finally {
      setSummaryLoading(false)
    }

    setTimeout(() => setSummaryCooldown(false), SUMMARY_COOLDOWN_MS)
  }, [canGenerateSummary, content])

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('请输入文章标题'); return }
    if (!content.trim()) { toast.error('请输入正文内容'); return }
    const formData = new FormData(e.currentTarget)
    formData.set('title', title)
    formData.set('content', content)
    formData.set('excerpt', excerpt)
    formData.set('published', published ? 'on' : 'off')
    const result = await savePost(formData)
    if (result.error) {
      setError(result.error)
    } else {
      router.push('/my-posts')
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} method="post" className="space-y-4" noValidate>
        {isEditing && <input type="hidden" name="_mode" value="update" />}
        {isEditing && <input type="hidden" name="_id" value={initialData.id} />}

        <div className="space-y-2">
          <label htmlFor="title" className="block text-sm font-medium">标题</label>
          <input
            id="title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="文章标题"
            className="w-full px-3 py-2 rounded-md border bg-transparent text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="excerpt" className="block text-sm font-medium">摘要</label>
          {modelName && <p className="text-xs text-muted-foreground">正文字数超100字后，可点击下方按钮由 <code className="font-mono">{modelName}</code> 总结摘要</p>}
          <div className="relative">
            <button
              type="button"
              onClick={handleGenerateSummary}
              disabled={summaryLoading || summaryCooldown}
              className={`absolute left-2.5 top-2.5 z-10 p-1.5 rounded-full transition-all ${
                summaryLoading
                  ? 'bg-blue-100 text-blue-500 animate-spin cursor-wait'
                  : canGenerateSummary && !summaryCooldown
                    ? 'text-gray-400 hover:bg-blue-500 hover:text-white cursor-pointer'
                    : 'text-gray-300 hover:bg-blue-500 hover:text-white cursor-pointer'
              }`}
              title={summaryCooldown ? '冷却中，请稍后再试' : canGenerateSummary ? '点击生成摘要' : ''}
            >
              {summaryLoading ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
              )}
            </button>
            <textarea
              id="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value.slice(0, SUMMARY_MAX_LENGTH))}
              placeholder="一句话概括文章..."
              maxLength={SUMMARY_MAX_LENGTH}
              rows={2}
              className="w-full px-3 py-2 pl-9 rounded-md border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <p className="absolute bottom-2 right-3 text-xs text-muted-foreground pointer-events-none select-none">
              {excerpt.length}/{SUMMARY_MAX_LENGTH}
            </p>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">源码</span>
            <button
              type="button"
              onClick={() => setTab(tab === 'edit' ? 'preview' : 'edit')}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                tab === 'preview' ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-background rounded-full transition-transform shadow-sm ${
                  tab === 'preview' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="text-sm text-muted-foreground">Markdown 渲染</span>
          </div>

          {tab === 'edit' ? (
            <>
              <div className="relative">
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, CONTENT_MAX_LENGTH))}
                maxLength={CONTENT_MAX_LENGTH}
                placeholder="# 开始写作...\n支持 Markdown 语法"
                className={`font-mono text-base md:text-sm p-4 h-[300px] w-full resize-none rounded-md border bg-transparent focus:outline-none focus:ring-2 ${
                contentLength >= CONTENT_MAX_ALERT
                  ? 'focus:ring-red-500 border-red-400'
                  : 'focus:ring-ring border-transparent'
              } pr-16`}
              />
              <button
                type="button"
                onClick={() => setFullscreen(true)}
                className="absolute -top-8 right-0 p-1.5 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title="全屏编辑"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
              </button>
              <p className={`absolute bottom-2 right-3 text-xs pointer-events-none select-none ${
                contentLength >= CONTENT_MAX_ALERT ? 'text-red-500' : 'text-muted-foreground'
              }`}>
                {contentLength}/{CONTENT_MAX_LENGTH} 字
              </p>
            </div>
            </>
          ) : (
            <div className="border rounded-lg p-6 overflow-auto h-[400px] bg-card">
              <MarkdownPreview content={content || '暂无内容'} />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center gap-3">
          <SubmitButton isEditing={isEditing} />
          <span className="text-sm text-muted-foreground">公开状态</span>
          <label className="inline-flex items-center cursor-pointer gap-2">
            <input
              type="checkbox"
              name="published"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="sr-only peer"
            />
            <div className={`relative w-9 h-5 rounded-full transition-colors ${published ? 'bg-primary' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-background rounded-full transition-transform ${published ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            <span className="text-xs text-muted-foreground">
              {published ? '公开发布' : '私密'}
            </span>
          </label>
        </div>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {published
            ? '公开发布后，所有人都能查看和评论这篇文章'
            : '私密文章仅你自己可见，其他人无法访问'
          }
        </p>
      </form>

      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between px-6 py-3 border-b">
            <span className="font-medium text-sm">全屏编辑</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground mr-2">
                {contentLength}/{CONTENT_MAX_LENGTH} 字
              </span>
              <button
                type="button"
                onClick={() => setFullscreen(false)}
                className="px-3 py-1.5 text-sm rounded-md border bg-background text-foreground hover:bg-accent transition-colors"
              >
                退出全屏
              </button>
            </div>
          </div>
          <textarea
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, CONTENT_MAX_LENGTH))}
            maxLength={CONTENT_MAX_LENGTH}
            placeholder="# 开始写作...\n支持 Markdown 语法"
            className={`flex-1 font-mono text-base md:text-lg p-6 w-full resize-none bg-transparent focus:outline-none border-none ${
              contentLength >= CONTENT_MAX_ALERT ? 'text-red-500' : ''
            }`}
          />
        </div>
      )}
    </div>
  )
}

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
    >
      {pending ? (isEditing ? '保存中...' : '创建中...') : (isEditing ? '保存修改' : '创建文章')}
    </button>
  )
}
