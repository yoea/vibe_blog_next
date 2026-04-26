import { getPostsByAuthor } from '@/lib/db/queries'
import { createClient } from '@/lib/supabase/server'
import { PostListClient } from '@/components/blog/post-list-client'
import { loadMoreMyPosts } from '@/lib/actions/post-actions'
import Link from 'next/link'

export default async function MyPostsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: posts, count, error } = await getPostsByAuthor(user.id, 1, 10)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">我的文章</h1>
        <Link href="/posts/new" className="inline-flex items-center px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-opacity cursor-pointer">
          写新文章
        </Link>
      </div>

      {error ? (
        <p className="text-destructive">加载失败: {error}</p>
      ) : (
        <PostListClient
          initialPosts={posts ?? []}
          initialTotal={count ?? 0}
          showActions
          onLoadMore={loadMoreMyPosts}
          loadedAllText="已加载全部文章"
        />
      )}
    </div>
  )
}
