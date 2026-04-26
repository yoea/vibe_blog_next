'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Edit2, Trash2 } from 'lucide-react'
import { deletePost } from '@/lib/actions/post-actions'

interface Post {
  id: string
  title: string
  slug: string
  published: boolean
  created_at: string
  excerpt?: string | null
}

export function PostCard({ post }: { post: Post }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deletePost(post.id)
      if (!result.error) {
        router.refresh()
      }
    })
  }

  return (
    <>
      <div className="flex items-center justify-between border rounded-lg p-4 bg-card">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Link href={`/posts/${post.slug}`} className="font-semibold text-lg hover:text-primary transition-colors line-clamp-2">
              {post.title}
            </Link>
            <Badge variant={post.published ? 'secondary' : 'outline'} className="shrink-0">
              {post.published ? '公开发布' : '私密'}
            </Badge>
          </div>
          {post.excerpt && (
            <p className="text-sm text-muted-foreground line-clamp-1 mb-1">{post.excerpt}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {new Date(post.created_at).toLocaleDateString('zh-CN')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
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
