import { getPostBySlug, getCommentsForPost } from '@/lib/db/queries'
import { notFound } from 'next/navigation'
import { MarkdownPreview } from '@/components/shared/markdown-preview'
import { PostInteraction } from '@/components/blog/post-interaction'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Edit2 } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { buildRefBreadcrumb } from '@/lib/constants'
import { formatTimeAgo } from '@/lib/utils/time'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ ref?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const { data: post } = await getPostBySlug(slug)
  if (!post) return { title: '文章不存在' }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `http://localhost:${process.env.PORT || 3000}`
  return {
    title: post.title,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? '',
      type: 'article',
      publishedTime: post.created_at,
      modifiedTime: post.updated_at,
      url: `${siteUrl}/posts/${slug}`,
      images: [{ url: `${siteUrl}/og-image.jpg`, width: 1200, height: 630 }],
    },
  }
}

export default async function PostPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { ref } = await searchParams
  const { data: post, error } = await getPostBySlug(slug)

  if (!post || error) {
    notFound()
  }

  const breadcrumbItems: { label: string; href?: string }[] = [
    { label: '首页', href: '/' },
    ...buildRefBreadcrumb(ref),
    { label: post.title },
  ]

  const { data: comments, total: totalComments } = await getCommentsForPost(post.id, { page: 1, pageSize: 10 })

  const supabase = await createClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  const currentUserId = currentUser?.id ?? null

  return (
    <div className="space-y-6">
      <Breadcrumb items={breadcrumbItems} />

      <article>
        <header className="space-y-4 pb-4">
          <h1 className="text-3xl font-bold leading-tight">{post.title}</h1>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              {post.author && (
                <Link href={`/author/${post.author_id}`} className="flex items-center gap-1.5 font-medium hover:text-foreground transition-colors">
                  <Avatar
                    avatarUrl={post.author.avatar_url ?? null}
                    displayName={post.author.name ?? post.author.email?.split('@')[0] ?? '作者'}
                    userId={post.author_id}
                    size="xs"
                  />
                  <span>{post.author.name ?? post.author.email?.split('@')[0] ?? '作者'}</span>
                </Link>
              )}
              <span className="text-[9px]">{new Date(post.created_at).toLocaleDateString('zh-CN')}</span>
              {post.updated_at !== post.created_at && (
                <span className="text-[9px]">修改于 {formatTimeAgo(post.updated_at)}</span>
              )}
            </div>
            {!post.published && (
              <span className="text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-xs">私密</span>
            )}
          </div>
          {post.excerpt && (
            <p className="text-sm text-muted-foreground max-w-prose leading-relaxed">
              {post.excerpt}
            </p>
          )}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.tags.map((tag) => (
                <Link
                  key={tag.slug}
                  href={`/tags/${encodeURIComponent(tag.slug)}`}
                  className="text-xs px-2 py-0.5 rounded hover:opacity-80 transition-opacity"
                  style={{ color: tag.color ?? '#3B82F6', backgroundColor: (tag.color ?? '#3B82F6') + '18' }}
                >
                  {tag.name}
                </Link>
              ))}
            </div>
          )}
        </header>

        <Separator />

        <div className="py-6">
          <MarkdownPreview content={post.content} />
        </div>

        <Separator />

        <PostInteraction
          postId={post.id}
          postAuthorId={post.author_id}
          currentUserId={currentUserId}
          initialLikeCount={post.like_count}
          isLiked={post.is_liked_by_current_user}
          initialCommentCount={post.comment_count}
          initialComments={comments ?? []}
          initialTotal={totalComments ?? 0}
          shareUrl={`${process.env.NEXT_PUBLIC_SITE_URL ?? `http://localhost:${process.env.PORT || 3000}`}/posts/${post.slug}`}
          published={post.published}
          editButton={currentUserId === post.author_id ? (
            <Button variant="outline" size="sm">
              <Link href={`/posts-edit/${post.slug}`} className="flex items-center gap-1">
                <Edit2 className="h-4 w-4" />
                编辑
              </Link>
            </Button>
          ) : undefined}
        />
      </article>
    </div>
  )
}
