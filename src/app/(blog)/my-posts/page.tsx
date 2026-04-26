import { getPostsByAuthor } from '@/lib/db/queries'
import { createClient } from '@/lib/supabase/server'
import { AuthorCard } from '@/components/blog/author-card'
import { PostListClient } from '@/components/blog/post-list-client'
import { loadMoreMyPosts } from '@/lib/actions/post-actions'
import { Calendar, FileText } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatDaysAgo } from '@/lib/utils/time'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { title: '我的文章' }

  const { data: userSettings } = await supabase
    .from('user_settings')
    .select('display_name')
    .eq('user_id', user.id)
    .maybeSingle()

  const authorName = userSettings?.display_name ?? user.email?.split('@')[0] ?? user.id.slice(0, 8)
  return { title: `${authorName}的文章` }
}

export default async function MyPostsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/my-posts')

  // Fetch display name
  const { data: userSettings } = await supabase
    .from('user_settings')
    .select('display_name, avatar_url')
    .eq('user_id', user.id)
    .maybeSingle()

  const authorName = userSettings?.display_name ?? user.email?.split('@')[0] ?? user.id.slice(0, 8)
  const authorAvatarUrl = userSettings?.avatar_url ?? null
  const createdAt = user.created_at ?? null

  const { data: posts, count, error } = await getPostsByAuthor(user.id, 1, 10)

  return (
    <div className="space-y-6">
      <AuthorCard
        userId={user.id}
        displayName={authorName}
        avatarUrl={authorAvatarUrl}
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
      <h1 className="text-2xl font-bold">文章列表</h1>
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
