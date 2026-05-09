'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { MarkdownPreview } from '@/components/shared/markdown-preview';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { savePost } from '@/lib/actions/post-actions';
import { useAutoSave, type AutoSaveStatus } from '@/lib/hooks/use-auto-save';
import { CoverImageUploader } from '@/components/blog/cover-image-uploader';
import { toast } from 'sonner';
import type { PostWithAuthor } from '@/lib/db/types';

const CONTENT_MAX_LENGTH = 50000;
const CONTENT_MAX_ALERT = CONTENT_MAX_LENGTH * 0.95;
const SUMMARY_COOLDOWN_MS = 10000;
const SUMMARY_MAX_LENGTH = 140;
const SUMMARY_MIN_CONTENT_LENGTH = 100;

interface Props {
  initialData?: PostWithAuthor;
  suggestedTags?: {
    name: string;
    slug: string;
    color: string | null;
    post_count: number;
  }[];
  resetKey?: number;
}

export function PostEditor({ initialData, suggestedTags, resetKey }: Props) {
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [fullscreen, setFullscreen] = useState(false);
  const [fsTab, setFsTab] = useState<'edit' | 'preview'>('edit');
  const [error, setError] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryCooldown, setSummaryCooldown] = useState(false);
  const [tagGenerating, setTagGenerating] = useState(false);
  const [tagCooldown, setTagCooldown] = useState(false);
  const [aiAlternative, setAiAlternative] = useState<string[]>([]);

  const lastSummaryTime = useRef(0);
  const lastTagTime = useRef(0);
  const router = useRouter();
  const isEditing = !!initialData;

  // Post identity (for new posts, these start null and get set after first auto-save)
  const [postId, setPostId] = useState<string | null>(initialData?.id ?? null);
  const [slug, setSlug] = useState<string | null>(initialData?.slug ?? null);

  // Editor state — prefer cloud draft over published data
  const draftData =
    initialData && 'draft_title' in initialData
      ? {
          title: (initialData as any).draft_title as string,
          content: (initialData as any).draft_content as string,
          excerpt: (initialData as any).draft_excerpt as string | null,
        }
      : null;
  const [title, setTitle] = useState(
    draftData?.title ?? initialData?.title ?? '',
  );
  const [content, setContent] = useState(
    draftData?.content ?? initialData?.content ?? '',
  );
  const [published, setPublished] = useState(
    initialData?.published ??
      (typeof window !== 'undefined' &&
        localStorage.getItem('lastPublishMode') === 'public'),
  );
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishSaving, setPublishSaving] = useState<
    'public' | 'private' | null
  >(null);
  const [excerpt, setExcerpt] = useState(
    draftData?.excerpt ?? initialData?.excerpt ?? '',
  );
  const [coverUrl, setCoverUrl] = useState<string | null>(
    (initialData as any)?.cover_image_url ?? null,
  );
  const [tags, setTags] = useState<string[]>(
    initialData && 'tags' in initialData
      ? ((initialData as any).tags?.map((t: any) => t.name) ?? [])
      : [],
  );
  const [tagInput, setTagInput] = useState('');
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const autoGrow = useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    // Save scroll position — setting height='auto' briefly collapses the textarea,
    // causing the browser to auto-scroll to keep the cursor visible.
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 120 + 'px';
    window.scrollTo(scrollX, scrollY);
  }, []);

  // Reset all fields when resetKey changes (used by clear-content button)
  useEffect(() => {
    if (resetKey !== undefined && resetKey > 0) {
      setTitle('');
      setContent('');
      setExcerpt('');
      setTags([]);
      setTagInput('');
      setPublished(false);
    }
  }, [resetKey]);

  // Cloud auto-save
  const {
    status: autoSaveStatus,
    countdown,
    hasContent,
    needsSave,
    retry,
  } = useAutoSave({
    postId,
    title,
    content,
    excerpt,
    onPostCreated: useCallback((newPostId: string, newSlug: string) => {
      setPostId(newPostId);
      setSlug(newSlug);
    }, []),
  });

  useEffect(() => {
    autoGrow();
  }, [content, tab, autoGrow]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  const contentLength = content.trim().length;
  const canGenerateSummary = contentLength >= SUMMARY_MIN_CONTENT_LENGTH;

  const handleGenerateSummary = useCallback(async (): Promise<
    string | null
  > => {
    if (!canGenerateSummary) {
      toast.warning(
        `正文内容不足，还需 ${SUMMARY_MIN_CONTENT_LENGTH - contentLength} 字`,
      );
      return null;
    }

    const now = Date.now();
    const elapsed = now - lastSummaryTime.current;
    if (elapsed < SUMMARY_COOLDOWN_MS) {
      return null;
    }

    lastSummaryTime.current = now;
    setSummaryLoading(true);
    setSummaryCooldown(true);

    try {
      const res = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? '生成摘要失败');
        return null;
      }
      const summary = data.summary.slice(0, SUMMARY_MAX_LENGTH);
      setExcerpt(summary);
      return summary;
    } catch {
      setError('网络异常，请稍后重试');
      return null;
    } finally {
      setSummaryLoading(false);
      setTimeout(() => setSummaryCooldown(false), SUMMARY_COOLDOWN_MS);
    }
  }, [canGenerateSummary, content, title]);

  // Helper: add a tag if not duplicate and under limit
  const addTag = useCallback((name: string) => {
    setTags((prev) => {
      if (prev.length >= 7 || prev.includes(name)) return prev;
      return [...prev, name.slice(0, 20)];
    });
  }, []);

  const handleGenerateTags = useCallback(async () => {
    if (contentLength < SUMMARY_MIN_CONTENT_LENGTH) {
      toast.warning(
        `正文内容不足，还需 ${SUMMARY_MIN_CONTENT_LENGTH - contentLength} 字`,
      );
      return;
    }

    const now = Date.now();
    if (now - lastTagTime.current < SUMMARY_COOLDOWN_MS) return;
    lastTagTime.current = now;
    setTagGenerating(true);
    setTagCooldown(true);

    try {
      const res = await fetch('/api/generate-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? '生成标签失败');
        return;
      }

      const highFreqNames = new Set((suggestedTags ?? []).map((t) => t.name));
      const allAiTags: string[] = [
        ...(data.recommended ?? []),
        ...(data.alternative ?? []),
      ];

      // Phase 1: auto-add tags matching existing high-frequency tags
      const autoAdded = new Set<string>();
      setTags((prev) => {
        const next = [...prev];
        for (const tag of allAiTags) {
          if (next.length >= 7) break;
          if (highFreqNames.has(tag) && !next.includes(tag)) {
            next.push(tag);
            autoAdded.add(tag);
          }
        }
        // Phase 2: fill remaining with recommended tags
        for (const tag of data.recommended ?? []) {
          if (next.length >= 7) break;
          if (!next.includes(tag) && !autoAdded.has(tag)) {
            next.push(tag);
            autoAdded.add(tag);
          }
        }
        return next;
      });

      // Build alternative list: all AI tags minus ones already added
      const allAddedNow = new Set(autoAdded);
      setTags((prev) => {
        // prev already updated; use it to filter alternatives
        return prev;
      });
      // Collect alternatives: tags not auto-added and not in current tags
      const alternatives = [
        ...(data.recommended ?? []),
        ...(data.alternative ?? []),
      ].filter((t) => !allAddedNow.has(t));
      setAiAlternative(alternatives);

      if (allAddedNow.size > 0) {
        toast.success(`已添加 ${allAddedNow.size} 个标签`);
      }
    } catch {
      toast.error('网络异常，请稍后重试');
    } finally {
      setTagGenerating(false);
      setTimeout(() => setTagCooldown(false), SUMMARY_COOLDOWN_MS);
    }
  }, [contentLength, title, content, suggestedTags]);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('请输入文章标题');
      return;
    }
    if (!content.trim()) {
      toast.error('请输入正文内容');
      return;
    }
    setShowPublishModal(true);
  };

  const confirmPublish = async (shouldPublish: boolean) => {
    setPublishSaving(shouldPublish ? 'public' : 'private');
    setPublished(shouldPublish);
    localStorage.setItem(
      'lastPublishMode',
      shouldPublish ? 'public' : 'private',
    );

    const formData = new FormData();
    formData.set('title', title);
    formData.set('content', content);
    formData.set('excerpt', excerpt);
    formData.set('published', shouldPublish ? 'on' : 'off');
    if (coverUrl) formData.set('cover_image_url', coverUrl);
    const finalTags = [...tags];
    const pendingTag = tagInput.trim();
    if (pendingTag && !finalTags.includes(pendingTag) && finalTags.length < 7) {
      finalTags.push(pendingTag.slice(0, 20));
    }
    formData.set('tags', JSON.stringify(finalTags));
    formData.set('_slug', slug ?? initialData?.slug ?? '');
    if (isEditing) {
      formData.set('_mode', 'update');
      formData.set('_id', initialData?.id ?? '');
    } else if (postId && slug) {
      formData.set('_mode', 'update');
      formData.set('_id', postId);
    }
    const result = await savePost(formData);
    setPublishSaving(null);
    if (result.error) {
      setError(result.error);
      setShowPublishModal(false);
    } else {
      setShowPublishModal(false);
      const isPublic = shouldPublish;
      toast.success(
        isPublic
          ? '发布成功，正在跳转到文章详情页'
          : '私密保存成功，正在跳转到文章详情页',
      );
      if (result.slug) {
        router.push(`/posts/${result.slug}`);
      } else {
        router.push('/profile');
      }
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col flex-1 gap-6 min-h-0">
      <form
        onSubmit={handleSubmit}
        method="post"
        className="flex flex-col flex-1 gap-4 min-h-0"
        noValidate
        data-testid="post-editor-form"
      >
        {isEditing && <input type="hidden" name="_mode" value="update" />}
        {isEditing && <input type="hidden" name="_id" value={initialData.id} />}

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            <label htmlFor="title" className="block text-sm font-medium">
              标题
            </label>
            <input
              id="title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="文章标题"
              data-testid="post-title"
              className="w-full px-3 py-2 rounded-md border bg-transparent text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="shrink-0">
            <CoverImageUploader
              postId={postId ?? initialData?.id ?? ''}
              currentCoverUrl={coverUrl}
              onCoverChange={setCoverUrl}
            />
          </div>
        </div>

        <div className="space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <label htmlFor="excerpt" className="text-sm font-medium">
              摘要
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerateSummary}
                disabled={
                  summaryLoading ||
                  summaryCooldown ||
                  contentLength < SUMMARY_MIN_CONTENT_LENGTH
                }
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-all ${
                  summaryLoading
                    ? 'bg-primary/10 text-primary border-primary/20 cursor-wait'
                    : contentLength >= SUMMARY_MIN_CONTENT_LENGTH &&
                        !summaryCooldown
                      ? 'text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary cursor-pointer'
                      : 'text-muted-foreground/50 cursor-not-allowed'
                }`}
                aria-label="AI 生成摘要"
                data-testid="ai-generate-summary"
                title={
                  summaryCooldown
                    ? '冷却中，请稍后再试'
                    : contentLength < SUMMARY_MIN_CONTENT_LENGTH
                      ? '正文内容不足 100 字'
                      : excerpt
                        ? '点击重新生成摘要'
                        : 'AI 生成摘要'
                }
              >
                {summaryLoading ? (
                  <svg
                    className="animate-spin h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                    <path d="M5 3v4" />
                    <path d="M19 17v4" />
                    <path d="M3 5h4" />
                    <path d="M17 19h4" />
                  </svg>
                )}
                {summaryLoading ? (
                  <>
                    <span className="hidden sm:inline">生成中...</span>
                  </>
                ) : excerpt ? (
                  <>
                    <span className="hidden sm:inline">重新生成摘要</span>
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">AI 生成摘要</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <div className="relative">
            <textarea
              id="excerpt"
              value={excerpt}
              onChange={(e) =>
                setExcerpt(e.target.value.slice(0, SUMMARY_MAX_LENGTH))
              }
              placeholder="一句话概括文章..."
              maxLength={SUMMARY_MAX_LENGTH}
              rows={3}
              data-testid="post-excerpt"
              className="w-full px-3 py-2 rounded-md border bg-transparent text-[16px] sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <p className="absolute bottom-2 right-3 text-xs text-muted-foreground pointer-events-none select-none">
              {excerpt.length}/{SUMMARY_MAX_LENGTH}
            </p>
          </div>
        </div>

        <div className="space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium">标签</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerateTags}
                disabled={
                  tagGenerating ||
                  tagCooldown ||
                  contentLength < SUMMARY_MIN_CONTENT_LENGTH
                }
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition-all ${
                  tagGenerating
                    ? 'bg-primary/10 text-primary border-primary/20 cursor-wait'
                    : contentLength >= SUMMARY_MIN_CONTENT_LENGTH &&
                        !tagCooldown
                      ? 'text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary cursor-pointer'
                      : 'text-muted-foreground/50 cursor-not-allowed'
                }`}
                aria-label="AI 推荐标签"
                data-testid="ai-generate-tags"
                title={
                  tagCooldown
                    ? '冷却中，请稍后再试'
                    : contentLength < SUMMARY_MIN_CONTENT_LENGTH
                      ? '正文内容不足 100 字'
                      : 'AI 推荐标签'
                }
              >
                {tagGenerating ? (
                  <svg
                    className="animate-spin h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                    <path d="M5 3v4" />
                    <path d="M19 17v4" />
                    <path d="M3 5h4" />
                    <path d="M17 19h4" />
                  </svg>
                )}
                {tagGenerating ? (
                  <span className="hidden sm:inline">生成中...</span>
                ) : (
                  <span className="hidden sm:inline">AI 推荐标签</span>
                )}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            按 Enter 添加标签，最多 7 个
          </p>
          {suggestedTags && suggestedTags.length > 0 && (
            <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-1 gap-y-0.5">
              常用标签：
              {suggestedTags
                .filter((t) => !tags.includes(t.name))
                .map((tag) => (
                  <button
                    key={tag.slug}
                    type="button"
                    onClick={() => addTag(tag.name)}
                    disabled={tags.length >= 7}
                    data-testid={`suggested-tag-${tag.slug}`}
                    className="text-xs px-1.5 py-0.5 rounded ml-1 hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      color: tag.color ?? '#3B82F6',
                      backgroundColor: (tag.color ?? '#3B82F6') + '18',
                    }}
                  >
                    {tag.name}
                  </button>
                ))}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-md border bg-transparent min-h-[2.25rem] focus-within:ring-2 focus-within:ring-ring">
            {tags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded bg-muted text-muted-foreground"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => setTags(tags.filter((_, j) => j !== i))}
                  className="hover:text-destructive transition-colors cursor-pointer"
                  aria-label={`移除标签 ${tag}`}
                  data-testid={`remove-tag-${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
            {tags.length < 7 && (
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = tagInput.trim();
                    if (val && !tags.includes(val) && tags.length < 7) {
                      setTags([...tags, val.slice(0, 20)]);
                    }
                    setTagInput('');
                  }
                }}
                placeholder={tags.length === 0 ? '添加标签...' : ''}
                data-testid="post-tag-input"
                className="flex-1 min-w-[80px] bg-transparent text-base sm:text-sm focus:outline-none"
              />
            )}
          </div>
          {aiAlternative.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground shrink-0">
                备选：
              </span>
              {aiAlternative.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    addTag(tag);
                    setAiAlternative((prev) => prev.filter((t) => t !== tag));
                  }}
                  disabled={tags.includes(tag) || tags.length >= 7}
                  data-testid={`alternative-tag-${tag}`}
                  className="text-xs px-2 py-0.5 rounded border border-dashed text-muted-foreground hover:text-foreground hover:border-solid transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-medium ${tab === 'edit' ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              源码
            </span>
            <Switch
              checked={tab === 'preview'}
              onChange={(c) => setTab(c ? 'preview' : 'edit')}
            />
            <span
              className={`text-xs font-medium ${tab === 'preview' ? 'text-foreground' : 'text-muted-foreground'}`}
            >
              预览
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton isEditing={isEditing || !!postId} />
            <AutoSaveIndicator
              status={autoSaveStatus}
              countdown={countdown}
              hasContent={hasContent}
              needsSave={needsSave}
              onRetry={retry}
            />
          </div>
        </div>

        <div className="flex flex-col flex-1 gap-4 min-h-0">
          {tab === 'edit' ? (
            <div className="relative">
              <textarea
                ref={contentRef}
                id="content"
                value={content}
                onChange={(e) => {
                  setContent(e.target.value.slice(0, CONTENT_MAX_LENGTH));
                }}
                maxLength={CONTENT_MAX_LENGTH}
                placeholder="# 开始写作...\n支持 Markdown 语法"
                data-testid="post-content"
                className={`font-mono text-base md:text-sm p-4 w-full rounded-md border bg-muted/60 focus:outline-none focus:ring-2 overflow-hidden resize-none ${
                  contentLength >= CONTENT_MAX_ALERT
                    ? 'focus:ring-red-500 border-red-400'
                    : 'focus:ring-ring border-transparent'
                } pr-11 md:pr-16 min-h-[200px]`}
              />
              <button
                type="button"
                onClick={() => setFullscreen(true)}
                className="absolute top-1.5 right-1.5 p-1.5 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors z-10"
                aria-label="全屏编辑"
                data-testid="editor-fullscreen-enter"
                title="全屏编辑"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              </button>
              <p
                className={`absolute bottom-2 right-3 text-xs pointer-events-none select-none z-10 ${
                  contentLength >= CONTENT_MAX_ALERT
                    ? 'text-red-500'
                    : 'text-muted-foreground'
                }`}
              >
                {contentLength}/{CONTENT_MAX_LENGTH} 字
              </p>
            </div>
          ) : (
            <div className="border rounded-lg p-6 overflow-auto flex-1 min-h-[200px] bg-card">
              <MarkdownPreview content={content || '暂无内容'} />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </form>

      <Dialog open={showPublishModal} onOpenChange={setShowPublishModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>您要公开此文章吗？</DialogTitle>
            <DialogDescription className="pt-2">
              公开发布的文章会出现在首页和您的作者主页，所有人都可以查看。
              <br />
              私密文章仅您自己可以在个人中心查看。
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              disabled={publishSaving !== null}
              onClick={() => confirmPublish(false)}
              data-testid="publish-private"
            >
              {publishSaving === 'private' ? '保存中...' : '自己可见'}
            </Button>
            <Button
              className="flex-1"
              disabled={publishSaving !== null}
              onClick={() => confirmPublish(true)}
              data-testid="publish-public"
            >
              {publishSaving === 'public' ? '保存中...' : '公开发布'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between px-6 py-3 border-b shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground select-none">
                源码
              </span>
              <Switch
                checked={fsTab === 'preview'}
                onChange={(c) => setFsTab(c ? 'preview' : 'edit')}
              />
              <span
                className={`text-xs font-medium select-none ${fsTab === 'preview' ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                预览
              </span>
            </div>
            <div className="flex items-center gap-3">
              <AutoSaveIndicator
                status={autoSaveStatus}
                countdown={countdown}
                hasContent={hasContent}
                needsSave={needsSave}
                onRetry={retry}
              />
              <span className="text-xs text-muted-foreground">
                {contentLength}/{CONTENT_MAX_LENGTH} 字
              </span>
              <button
                type="button"
                onClick={() => setFullscreen(false)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="退出全屏"
                data-testid="editor-fullscreen-exit"
                title="退出全屏 (Esc)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              </button>
            </div>
          </div>

          {fsTab === 'edit' ? (
            <textarea
              autoFocus
              value={content}
              onChange={(e) =>
                setContent(e.target.value.slice(0, CONTENT_MAX_LENGTH))
              }
              maxLength={CONTENT_MAX_LENGTH}
              placeholder="# 开始写作...\n支持 Markdown 语法"
              className={`flex-1 font-mono text-base md:text-lg p-6 w-full resize-none bg-transparent focus:outline-none border-none ${
                contentLength >= CONTENT_MAX_ALERT ? 'text-red-500' : ''
              }`}
            />
          ) : (
            <div className="flex-1 overflow-auto p-6">
              <MarkdownPreview content={content || '暂无内容'} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  const label = pending
    ? isEditing
      ? '保存中...'
      : '创建中...'
    : isEditing
      ? '保存修改'
      : '创建文章';
  return (
    <Button
      type="submit"
      disabled={pending}
      size="sm"
      data-testid="post-submit"
    >
      {label}
    </Button>
  );
}

// ── Reusable toggle switch ──
function Switch({
  checked,
  onChange,
  size = 'sm',
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  size?: 'sm' | 'md';
}) {
  const width = size === 'sm' ? 'w-9' : 'w-11';
  const height = size === 'sm' ? 'h-5' : 'h-6';
  const circle = size === 'sm' ? 'w-4 h-4' : 'w-4 h-4';
  const translate = size === 'sm' ? 'translate-x-4' : 'translate-x-[1.125rem]';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="切换编辑/预览"
      data-testid="editor-switch-mode"
      onClick={() => onChange(!checked)}
      className={`relative ${width} ${height} rounded-full transition-colors cursor-pointer ${
        checked ? 'bg-primary' : 'bg-gray-300'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 ${circle} bg-background rounded-full transition-transform shadow-sm ${
          checked ? translate : 'translate-x-0'
        }`}
      />
    </button>
  );
}

// ── Auto-save status indicator ──
function AutoSaveIndicator({
  status,
  countdown,
  hasContent,
  needsSave,
  onRetry,
}: {
  status: AutoSaveStatus;
  countdown: number;
  hasContent: boolean;
  needsSave: boolean;
  onRetry: () => void;
}) {
  if (!hasContent) return null;

  // No changes since last save
  if (status === 'idle' && !needsSave) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/50">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
        已暂存草稿
      </span>
    );
  }

  if (status === 'idle') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
        {countdown}秒后自动暂存草稿
        <button
          type="button"
          onClick={onRetry}
          className="underline hover:text-foreground cursor-pointer ml-0.5"
        >
          立即暂存
        </button>
      </span>
    );
  }
  const label =
    status === 'saving'
      ? '暂存草稿中...'
      : status === 'saved'
        ? '已暂存草稿'
        : '暂存失败';
  const dotColor =
    status === 'saving'
      ? 'bg-muted-foreground/50'
      : status === 'saved'
        ? 'bg-green-500'
        : 'bg-red-500';
  const textColor =
    status === 'error' ? 'text-red-500' : 'text-muted-foreground';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${dotColor}`} />
      <span className={textColor}>{label}</span>
      {status === 'error' && (
        <button
          type="button"
          onClick={onRetry}
          className="underline hover:text-foreground cursor-pointer"
        >
          重试
        </button>
      )}
    </span>
  );
}
