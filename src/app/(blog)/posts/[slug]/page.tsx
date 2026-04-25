import { getPostBySlug, getCommentsForPost } from '@/lib/db/queries'
import { notFound } from 'next/navigation'
import { MarkdownPreview } from '@/components/shared/markdown-preview'
import { LikeButton } from '@/components/blog/like-button'
import { CommentSection } from '@/components/blog/comment-section'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Edit2 } from 'lucide-react'
import { Separator } from '@/components/ui/separator'

export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params
  const { data: post, error } = await getPostBySlug(slug)

  if (!post || error) {
    notFound()
  }

  const { data: comments } = await getCommentsForPost(post.id)

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm">
        <Link href="/" className="flex items-center gap-1 pl-0">
          <ArrowLeft className="h-4 w-4" />
          返回文章列表
        </Link>
      </Button>

      <article>
        <header className="space-y-3">
          <h1 className="text-3xl font-bold leading-tight">{post.title}</h1>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>{new Date(post.created_at).toLocaleDateString('zh-CN')}</span>
              {post.updated_at !== post.created_at && (
                <span>修改于 {new Date(post.updated_at).toLocaleDateString('zh-CN')}</span>
              )}
              {post.author?.email && (
                <span>作者: {post.author.email.split('@')[0]}</span>
              )}
            </div>
            {!post.published && (
              <span className="text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-xs">草稿</span>
            )}
          </div>
        </header>

        <Separator />

        <div className="py-6">
          <MarkdownPreview content={post.content} />
        </div>

        <Separator />

        <div className="flex items-center gap-3 pt-2">
          <LikeButton
            postId={post.id}
            initialCount={post.like_count}
            isLiked={post.is_liked_by_current_user}
          />
          <div className="ml-auto">
            <Button variant="outline" size="sm">
              <Link href={`/posts-edit/${post.slug}`} className="flex items-center gap-1">
                <Edit2 className="h-4 w-4" />
                编辑
              </Link>
            </Button>
          </div>
        </div>
      </article>

      <Separator />

      <CommentSection postId={post.id} initialComments={comments ?? []} />
    </div>
  )
}
