import { getPostsByTag } from '@/lib/db/queries'
import { loadMorePostsByTag } from '@/lib/actions/post-actions'
import { PostListClient } from '@/components/blog/post-list-client'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: rawSlug } = await params
  const slug = decodeURIComponent(rawSlug)
  const { tagName } = await getPostsByTag(slug, 1, 1)
  return {
    title: tagName ? `标签：${tagName}` : '标签',
  }
}

export default async function TagPage({ params }: PageProps) {
  const { slug: rawSlug } = await params
  const slug = decodeURIComponent(rawSlug)
  const { data: posts, count, tagName, tagColor, error } = await getPostsByTag(slug, 1, 10)

  if (error || !tagName) {
    notFound()
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
        loadedAllText="已加载全部文章"
        linkRef={`tag:${tagName}`}
      />
    </div>
  )
}
