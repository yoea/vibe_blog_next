'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar, Heart, MessageSquare, Edit2, Trash2, Globe, Lock, Pin, PinOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { deletePost, togglePinPost } from '@/lib/actions/post-actions'
import { toast } from 'sonner'

interface PostData {
  id: string
  author_id: string
  title: string
  slug: string
  published: boolean
  is_pinned?: boolean
  created_at: string
  excerpt?: string | null
  like_count?: number
  comment_count?: number
}

export function MyPostRowList({
  initialPosts,
  initialTotal,
  onLoadMore,
}: {
  initialPosts: PostData[]
  initialTotal: number
  onLoadMore: (page: number) => Promise<{ data?: PostData[]; count?: number | null; error?: string | null }>
}) {
  const [posts, setPosts] = useState(initialPosts)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setPosts(initialPosts)
    setTotal(initialTotal)
    setPage(1)
  }, [initialPosts, initialTotal])

  const hasMore = posts.length < total

  const handleLoadMore = async () => {
    setLoading(true)
    const nextPage = page + 1
    const result = await onLoadMore(nextPage)
    const newPosts = result.data
    if (newPosts) {
      if (newPosts.length === 0) {
        toast.info('已加载全部文章')
      } else {
        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id))
          const trulyNew = newPosts.filter((p) => !existingIds.has(p.id))
          if (trulyNew.length === 0) {
            toast.info('已加载全部文章')
            return prev
          }
          return [...prev, ...trulyNew]
        })
        setPage(nextPage)
      }
    }
    setLoading(false)
  }

  const handleDelete = async (postId: string) => {
    const result = await deletePost(postId)
    if (!result.error) {
      setPosts((prev) => prev.filter((p) => p.id !== postId))
      toast.success('文章已删除')
      router.refresh()
    } else {
      toast.error('删除失败，请重试')
    }
  }

  if (!posts.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg mb-2">还没有文章</p>
        <p className="text-sm">点击右上角按钮开始写作</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg divide-y">
        {posts.map((post) => (
          <CompactPostRow key={post.id} post={post} onDelete={handleDelete} />
        ))}
      </div>

      {hasMore ? (
        <div className="flex justify-center pt-2">
          <button type="button" onClick={handleLoadMore} disabled={loading} className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer disabled:opacity-50">
            {loading ? '加载中...' : '加载更多'}
          </button>
        </div>
      ) : (
        <div className="flex justify-center pt-2">
          <span className="text-sm text-muted-foreground/60">已显示全部文章</span>
        </div>
      )}
    </div>
  )
}

function CompactPostRow({ post, onDelete }: { post: PostData; onDelete: (id: string) => void }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [pinning, setPinning] = useState(false)
  const [pinned, setPinned] = useState(post.is_pinned ?? false)

  const handleDelete = () => {
    startTransition(async () => {
      await onDelete(post.id)
      setShowConfirm(false)
    })
  }

  const handleTogglePin = () => {
    setPinning(true)
    startTransition(async () => {
      const result = await togglePinPost(post.id)
      setPinning(false)
      if (result.error) {
        toast.error(result.error)
      } else {
        setPinned(result.pinned ?? !pinned)
        toast.success(result.pinned ? '已置顶' : '已取消置顶')
      }
    })
  }

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-primary rotate-45" />}
          <Link
            href={`/posts/${post.slug}`}
            className="truncate text-sm font-medium hover:text-primary transition-colors"
          >
            {post.title}
          </Link>
          <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-medium px-1 py-0.5 rounded ${
            post.published
              ? 'text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950'
              : 'text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950'
          }`}>
            {post.published ? <Globe className="h-2.5 w-2.5" /> : <Lock className="h-2.5 w-2.5" />}
            {post.published ? '公开' : '私密'}
          </span>
        </div>

        <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Calendar className="h-3 w-3" />
          {new Date(post.created_at).toLocaleDateString('zh-CN')}
        </span>

        <span className="hidden md:flex items-center gap-1 text-xs text-muted-foreground shrink-0" title="点赞数">
          <Heart className="h-3 w-3" />
          {post.like_count ?? 0}
        </span>

        <span className="hidden md:flex items-center gap-1 text-xs text-muted-foreground shrink-0" title="评论数">
          <MessageSquare className="h-3 w-3" />
          {post.comment_count ?? 0}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleTogglePin} disabled={pinning} title={pinned ? '取消置顶' : '置顶'}>
            {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </Button>
          <Link href={`/posts-edit/${post.slug}`}>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => setShowConfirm(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除文章</DialogTitle>
            <DialogDescription>确定删除「{post.title}」？此操作不可撤销。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={isPending}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>
              {isPending ? '删除中...' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
