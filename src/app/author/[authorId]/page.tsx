import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PostCard } from '@/components/blog/post-card'
import { AuthorCard } from '@/components/blog/author-card'
import { GuestbookSection } from '@/components/blog/guestbook-section'
import { getGuestbookMessages } from '@/lib/db/queries'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, FileText, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { formatDaysAgo } from '@/lib/utils/time'
import type { Metadata } from 'next'
import type { PostWithAuthor } from '@/lib/db/types'

interface PageProps {
  params: Promise<{ authorId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { authorId } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_settings')
    .select('display_name')
    .eq('user_id', authorId)
    .maybeSingle()
  const name = data?.display_name ?? authorId.slice(0, 8)
  return { title: `${name}的文章` }
}

export default async function AuthorPage({ params }: PageProps) {
  const { authorId } = await params

  const supabase = await createClient()

  const { data: authorSettings } = await supabase
    .from('user_settings')
    .select('display_name, avatar_url')
    .eq('user_id', authorId)
    .maybeSingle()

  // Fetch auth user for registration time
  let createdAt: string | null = null
  try {
    const admin = createAdminClient()
    const { data: authUser } = await admin.auth.admin.getUserById(authorId)
    if (authUser?.user?.created_at) {
      createdAt = authUser.user.created_at
    }
  } catch {
    // Admin client may not have service role key
  }

  const authorName = authorSettings?.display_name ?? authorId.slice(0, 8)
  const authorAvatarUrl = authorSettings?.avatar_url ?? null

  // Fetch current user and posts in parallel
  const [{ data: { user: currentUser } }, { data: posts, error }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('posts')
      .select(`
        *,
        like_count:post_likes(count),
        comment_count:post_comments(count)
      `)
      .eq('author_id', authorId)
      .eq('published', true)
      .order('created_at', { ascending: false }),
  ])

  if (error || !posts) {
    return notFound()
  }

  // Check which posts the current user has liked
  const postIds = posts.map((p: any) => p.id)
  const likedPostIds = new Set<string>()
  if (currentUser && postIds.length > 0) {
    const { data: userLikes } = await supabase
      .from('post_likes')
      .select('post_id')
      .in('post_id', postIds)
      .eq('user_id', currentUser.id)
    if (userLikes) {
      for (const l of userLikes) likedPostIds.add(l.post_id)
    }
  }

  const postsWithAuthor = posts.map((p: any) => ({
    ...p,
    author: { email: null, name: authorName, avatar_url: authorAvatarUrl },
    like_count: p.like_count?.[0]?.count ?? 0,
    comment_count: p.comment_count?.[0]?.count ?? 0,
    is_liked_by_current_user: likedPostIds.has(p.id),
  })) as PostWithAuthor[]

  // Fetch guestbook messages
  const { data: guestbookMessages, total: guestbookTopLevel, fullTotal: guestbookTotal } = await getGuestbookMessages(authorId, { page: 1, pageSize: 10 })

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm">
        <Link href="/author" className="flex items-center gap-1 pl-0">
          <ArrowLeft className="h-4 w-4" />
          返回作者列表
        </Link>
      </Button>

      <h1 className="text-2xl font-bold">作者详情</h1>

      <AuthorCard
        userId={authorId}
        displayName={authorName}
        avatarUrl={authorAvatarUrl}
        stats={[
          { icon: <Calendar className="h-3 w-3" />, label: `注册 ${createdAt ? formatDaysAgo(createdAt) : '-'}` },
          { icon: <FileText className="h-3 w-3" />, label: `${postsWithAuthor.length} 篇文章` },
          { icon: <MessageCircle className="h-3 w-3" />, label: `${guestbookTotal ?? 0} 条留言`, href: '#guestbook' },
        ]}
      />

      {postsWithAuthor.length > 0 ? (
        <div className="grid gap-4">
          {postsWithAuthor.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p>该用户还没有发布文章</p>
        </div>
      )}

      <Separator />

      <GuestbookSection
        toAuthorId={authorId}
        currentUserId={currentUser?.id ?? null}
        initialMessages={guestbookMessages ?? []}
        initialTotal={guestbookTopLevel ?? 0}
      />
    </div>
  )
}
