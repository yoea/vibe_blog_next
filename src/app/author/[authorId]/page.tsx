import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { PostCard } from '@/components/blog/post-card'
import { GuestbookSection } from '@/components/blog/guestbook-section'
import { getGuestbookMessages } from '@/lib/db/queries'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { getUserColor } from '@/lib/utils/colors'
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
  const name = data?.display_name ?? '作者'
  return { title: `${name}的文章` }
}

export default async function AuthorPage({ params }: PageProps) {
  const { authorId } = await params

  const supabase = await createClient()

  const { data: authorSettings } = await supabase
    .from('user_settings')
    .select('display_name')
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

  const { data: posts, error } = await supabase
    .from('posts')
    .select(`
      *,
      like_count:post_likes(count),
      comment_count:post_comments(count)
    `)
    .eq('author_id', authorId)
    .eq('published', true)
    .order('created_at', { ascending: false })

  if (error || !posts) {
    return notFound()
  }

  const authorName = authorSettings?.display_name ?? null

  const postsWithAuthor = posts.map((p: any) => ({
    ...p,
    author: { email: null, name: authorName },
    like_count: p.like_count?.[0]?.count ?? 0,
    comment_count: p.comment_count?.[0]?.count ?? 0,
    is_liked_by_current_user: false,
  })) as PostWithAuthor[]

  // Fetch guestbook messages
  const { data: guestbookMessages, total: guestbookTotal } = await getGuestbookMessages(authorId, { page: 1, pageSize: 10 })
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm">
        <Link href="/" className="flex items-center gap-1 pl-0">
          <ArrowLeft className="h-4 w-4" />
          返回文章列表
        </Link>
      </Button>

      <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
        <div
          className="flex items-center justify-center w-12 h-12 rounded-full text-lg font-bold text-white shrink-0"
          style={{ backgroundColor: getUserColor(authorId) }}
        >
          {(authorName ?? '?')[0]}
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-bold">{authorName ?? '作者'}</h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              注册 {createdAt ? formatDaysAgo(createdAt) : '-'}
            </span>
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {postsWithAuthor.length} 篇文章
            </span>
          </div>
        </div>
      </div>

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
        initialTotal={guestbookTotal ?? 0}
      />
    </div>
  )
}
