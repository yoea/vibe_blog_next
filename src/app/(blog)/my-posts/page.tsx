import { getPostsByAuthor } from '@/lib/db/queries'
import { createClient } from '@/lib/supabase/server'
import { AuthorCard } from '@/components/blog/author-card'
import { PostListClient } from '@/components/blog/post-list-client'
import { loadMoreMyPosts } from '@/lib/actions/post-actions'
import Link from 'next/link'
import { ArrowLeft, Calendar, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDaysAgo } from '@/lib/utils/time'

export default async function MyPostsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Fetch display name
  const { data: userSettings } = await supabase
    .from('user_settings')
    .select('display_name')
    .eq('user_id', user.id)
    .maybeSingle()

  const authorName = userSettings?.display_name ?? user.email?.split('@')[0] ?? '我'
  const createdAt = user.created_at ?? null

  const { data: posts, count, error } = await getPostsByAuthor(user.id, 1, 10)

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm">
        <Link href="/" className="flex items-center gap-1 pl-0">
          <ArrowLeft className="h-4 w-4" />
          返回文章列表
        </Link>
      </Button>

      <AuthorCard
        userId={user.id}
        displayName={authorName}
        stats={[
          { icon: <Calendar className="h-3 w-3" />, label: `加入 ${createdAt ? formatDaysAgo(createdAt) : '-'}` },
          { icon: <FileText className="h-3 w-3" />, label: `${count ?? 0} 篇文章` },
        ]}
        actions={
          <Link href="/posts/new">
            <Button size="sm">写新文章</Button>
          </Link>
        }
      />

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
