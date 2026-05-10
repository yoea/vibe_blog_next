import { getPostsByTag } from '@/lib/db/queries';
import { loadMorePostsByTag } from '@/lib/actions/post-actions';
import { PostListClient } from '@/components/blog/post-list-client';
import { linkRefTag } from '@/lib/constants';

export const revalidate = 300;
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const { tagName, data: posts } = await getPostsByTag(slug, 1, 1);
  const title = tagName ? `标签：${tagName}` : '标签';
  const description = posts?.[0]?.excerpt || `浏览标签「${tagName}」下的文章`;
  return {
    title,
    openGraph: { title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function TagPage({ params }: PageProps) {
  const { slug: rawSlug } = await params;
  const slug = decodeURIComponent(rawSlug);
  const {
    data: posts,
    count,
    tagName,
    tagColor,
    error,
  } = await getPostsByTag(slug, 1, 10);

  if (error || !tagName) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          标签：
          <span style={{ color: tagColor ?? undefined }}>{tagName}</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          共 {count ?? 0} 篇文章
        </p>
      </div>

      <PostListClient
        initialPosts={posts ?? []}
        initialTotal={count ?? 0}
        onLoadMore={loadMorePostsByTag.bind(null, slug)}
        linkRef={linkRefTag(tagName)}
      />
    </div>
  );
}
