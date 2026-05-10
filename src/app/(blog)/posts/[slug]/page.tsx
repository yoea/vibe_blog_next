import { getPostBySlug, getCommentsForPost } from '@/lib/db/queries';
import { notFound } from 'next/navigation';
import { MarkdownPreview } from '@/components/shared/markdown-preview';
import { PostActionBar } from '@/components/blog/post-interaction';
import { CommentSection } from '@/components/blog/comment-section';
import { ArchivePostButton } from '@/components/blog/archive-post-button';
import { CoverReveal } from '@/components/blog/cover-reveal';
import { Avatar } from '@/components/ui/avatar';

export const revalidate = 300;
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Edit2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { TableOfContents } from '@/components/blog/table-of-contents';
import { buildRefBreadcrumb } from '@/lib/constants';
import { formatTimeAgo } from '@/lib/utils/time';
import { createClient } from '@/lib/supabase/server';
import { isSuperAdmin } from '@/lib/utils/admin';
import { getSiteUrl } from '@/lib/site-url';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { data: post } = await getPostBySlug(slug);
  if (!post) return { title: '文章不存在' };
  const siteUrl = await getSiteUrl();
  const ogImage = post.cover_image_url || `${siteUrl}/og-image.jpg`;
  return {
    title: post.title,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? '',
      type: 'article',
      publishedTime: post.created_at,
      modifiedTime: post.updated_at,
      url: `${siteUrl}/posts/${slug}`,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt ?? '',
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
  };
}

export default async function PostPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { ref } = await searchParams;
  const { data: post, error } = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  if (error === 'PERMISSION_DENIED') {
    return (
      <div className="text-center py-20 space-y-4">
        <h1 className="text-2xl font-bold">暂未开放查看权限</h1>
        <p className="text-muted-foreground">
          这篇文章已被作者设为私密，仅作者本人可查看。
        </p>
        <Link
          href={`/author/${post.author_id}`}
          className="text-sm text-primary hover:underline inline-block"
        >
          前往作者主页 →
        </Link>
      </div>
    );
  }

  if (error) {
    notFound();
  }

  const breadcrumbItems: { label: string; href?: string }[] = [
    { label: '首页', href: '/' },
    ...buildRefBreadcrumb(ref),
    { label: post.title },
  ];

  const { data: comments, total: totalComments } = await getCommentsForPost(
    post.id,
    { page: 1, pageSize: 10 },
  );

  const supabase = await createClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  const currentUserId = currentUser?.id ?? null;
  const isAdmin = await isSuperAdmin(currentUser);

  const { data: tocConfig } = await supabase
    .from('site_config')
    .select('value')
    .eq('key', 'show_toc')
    .maybeSingle();
  const showToc = tocConfig?.value !== 'false';

  return (
    <>
      <TableOfContents enabled={showToc} />
      <div className="space-y-6">
        <Breadcrumb items={breadcrumbItems} />

        <article>
          <header className="space-y-4 pb-4">
            <h1 className="text-3xl font-bold leading-tight">{post.title}</h1>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                {post.author && (
                  <Link
                    href={`/author/${post.author_id}`}
                    className="flex items-center gap-1.5 font-medium hover:text-foreground transition-colors"
                  >
                    <Avatar
                      avatarUrl={post.author.avatar_url ?? null}
                      displayName={
                        post.author.name ??
                        post.author.email?.split('@')[0] ??
                        '作者'
                      }
                      userId={post.author_id}
                      size="xs"
                    />
                    <span>
                      {post.author.name ??
                        post.author.email?.split('@')[0] ??
                        '作者'}
                    </span>
                  </Link>
                )}
                <span className="text-[9px]">
                  {new Date(post.created_at).toLocaleDateString('zh-CN')}
                </span>
                {post.updated_at !== post.created_at && (
                  <span className="text-[9px]">
                    修改于 {formatTimeAgo(post.updated_at)}
                  </span>
                )}
              </div>
              {!post.published && (
                <span className="text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-xs">
                  私密
                </span>
              )}
            </div>
            <PostActionBar
              postId={post.id}
              initialLikeCount={post.like_count}
              isLiked={post.is_liked_by_current_user}
              commentCount={post.comment_count}
              shareUrl={`${await getSiteUrl()}/posts/${post.slug}`}
              published={post.published}
              editButton={
                currentUserId === post.author_id ? (
                  <Button variant="outline" size="sm">
                    <Link
                      href={`/posts-edit/${post.slug}`}
                      className="flex items-center gap-1"
                    >
                      <Edit2 className="h-4 w-4" />
                      编辑
                    </Link>
                  </Button>
                ) : undefined
              }
              archiveButton={
                isAdmin ? (
                  <ArchivePostButton postId={post.id} postTitle={post.title} />
                ) : undefined
              }
            />
            {post.excerpt && (
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {post.excerpt}
              </p>
            )}
          </header>

          {post.cover_image_url && (
            <>
              {/* 移动端：完整显示，不变形 */}
              <img
                src={post.cover_image_url}
                alt={post.title}
                className="sm:hidden w-full rounded-lg"
              />
              {/* PC端：高度为宽度的1/3，随滚动揭示下半部分 */}
              <div className="hidden sm:block relative w-full aspect-[3/1] overflow-hidden rounded-lg">
                <CoverReveal src={post.cover_image_url} alt={post.title} />
              </div>
            </>
          )}

          <Separator />

          <div className="py-6">
            <MarkdownPreview content={post.content} />
          </div>

          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {post.tags.map(
                (tag: { name: string; slug: string; color: string | null }) => (
                  <Link
                    key={tag.slug}
                    href={`/tags/${encodeURIComponent(tag.slug)}`}
                    className="text-xs px-2 py-0.5 rounded hover:opacity-80 transition-opacity"
                    style={{
                      color: tag.color ?? '#3B82F6',
                      backgroundColor: (tag.color ?? '#3B82F6') + '18',
                    }}
                  >
                    {tag.name}
                  </Link>
                ),
              )}
            </div>
          )}

          <Separator className="mt-4 mb-6" />

          <h2 className="text-xl font-bold mb-4">评论</h2>

          <CommentSection
            postId={post.id}
            postAuthorId={post.author_id}
            currentUserId={currentUserId}
            initialComments={comments ?? []}
            initialTotal={totalComments ?? 0}
          />
        </article>
      </div>
    </>
  );
}
