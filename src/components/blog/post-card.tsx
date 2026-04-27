'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar, Heart, MessageSquare, Edit2, Trash2, Globe, Lock, User, Pin, PinOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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

interface PostCardData {
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
  author?: { email?: string | null; name?: string | null; avatar_url?: string | null } | null
}

export function PostCard({ post, showActions }: { post: PostCardData; showActions?: boolean }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [pinning, setPinning] = useState(false)
  const [pinned, setPinned] = useState(post.is_pinned ?? false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deletePost(post.id)
      if (!result.error) {
        setShowConfirm(false)
        toast.success('文章已删除')
        router.refresh()
      } else {
        toast.error('删除失败，请重试')
      }
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

  const statusIcon = post.published
    ? <Globe className="h-3 w-3" />
    : <Lock className="h-3 w-3" />

  const metaRow = (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      <span className="flex items-center gap-1">
        <Calendar className="h-3 w-3" />
        {new Date(post.created_at).toLocaleDateString('zh-CN')}
      </span>
      <span className="flex items-center gap-1">
        <Heart className="h-3 w-3" />
        {post.like_count ?? 0}
      </span>
      <span className="flex items-center gap-1">
        <MessageSquare className="h-3 w-3" />
        {post.comment_count ?? 0}
      </span>
      {post.author?.name && post.author_id && (
        <Link href={`/author/${post.author_id}`} className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors">
          <User className="h-3 w-3" />
          {post.author.name}
        </Link>
      )}
    </div>
  )

  // "My Posts" layout: border div + edit/delete buttons
  if (showActions) {
    return (
      <>
        <div className="grid grid-cols-[1fr_auto] gap-3 border rounded-lg p-4 bg-card">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Link
                href={`/posts/${post.slug}`}
                className="truncate font-semibold text-lg hover:text-primary transition-colors block"
              >
                {post.title}
              </Link>
              {pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-primary rotate-45" />}
              <span className={`shrink-0 inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded ${
                post.published
                  ? 'text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950'
                  : 'text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950'
              }`}>
                {statusIcon}
                {post.published ? '公开' : '私密'}
              </span>
            </div>
            {post.excerpt && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-1">{post.excerpt}</p>
            )}
            {metaRow}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <Button variant="outline" size="sm" onClick={handleTogglePin} disabled={pinning}>
              {pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline ml-1">{pinned ? '取消置顶' : '置顶'}</span>
            </Button>
            <Link href={`/posts-edit/${post.slug}`}>
              <Button variant="outline" size="sm">
                <Edit2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline ml-1">编辑</span>
              </Button>
            </Link>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-red-50" onClick={() => setShowConfirm(true)}>
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline ml-1">删除</span>
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

  // Public list layout
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <Link href={`/posts/${post.slug}`} className="block min-w-0 hover:text-primary transition-colors">
          <h2 className="text-xl font-semibold leading-tight truncate">{post.title}</h2>
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {post.excerpt && (
          <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
        )}
        {metaRow}
      </CardContent>
    </Card>
  )
}
