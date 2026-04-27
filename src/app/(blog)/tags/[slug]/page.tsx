import { getPostsByTag } from '@/lib/db/queries'
import { loadMorePostsByTag } from '@/lib/actions/post-actions'
import { PostListClient } from '@/components/blog/post-list-client'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const { data: _, tagName } = await getPostsByTag(slug, 1, 1)
  return {
    title: tagName ? `标签：${tagName}` : '标签',
  }
}

export default async function TagPage({ params }: PageProps) {
  const { slug } = await params
  const { data: posts, count, tagName, error } = await getPostsByTag(slug, 1, 10)

  if (error || !tagName) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        返回首页
      </Link>

      <div>
        <h1 className="text-2xl font-bold">标签：{tagName}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          共 {count ?? 0} 篇文章
        </p>
      </div>

      <PostListClient
        initialPosts={posts ?? []}
        initialTotal={count ?? 0}
        onLoadMore={(page) => loadMorePostsByTag(slug, page)}
        loadedAllText="已加载全部文章"
      />
    </div>
  )
}
