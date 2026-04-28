import { getPostsByAuthor, getGuestbookMessages } from '@/lib/db/queries'
import { createClient } from '@/lib/supabase/server'
import { ProfileInfoCard } from '@/components/profile/profile-info-card'
import { MyPostRowList } from '@/components/profile/my-post-row'
import { GuestbookSection } from '@/components/blog/guestbook-section'
import { loadMoreMyPosts } from '@/lib/actions/post-actions'
import { isSuperAdmin } from '@/lib/utils/admin'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { title: '个人中心' }

  const { data: userSettings } = await supabase
    .from('user_settings')
    .select('display_name')
    .eq('user_id', user.id)
    .maybeSingle()

  const authorName = userSettings?.display_name ?? user.email?.split('@')[0] ?? user.id.slice(0, 8)
  return { title: `${authorName}的个人中心` }
}

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/profile')

  // Fetch user settings
  const { data: userSettings } = await supabase
    .from('user_settings')
    .select('display_name, avatar_url')
    .eq('user_id', user.id)
    .maybeSingle()

  const displayName = userSettings?.display_name ?? user.email?.split('@')[0] ?? user.id.slice(0, 8)
  const avatarUrl = userSettings?.avatar_url ?? null
  const createdAt = user.created_at ?? null

  // Fetch posts
  const { data: posts, count, error: postsError } = await getPostsByAuthor(user.id, 1, 10)

  // Fetch guestbook messages left for this user
  const { data: guestbookMessages, total: guestbookTotal } = await getGuestbookMessages(user.id, { page: 1, pageSize: 10 })

  const isAdmin = await isSuperAdmin()

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">个人中心</h1>

      {/* Module 1: My Info */}
      <section>
        <ProfileInfoCard
          userId={user.id}
          displayName={displayName}
          avatarUrl={avatarUrl}
          email={user.email ?? null}
          emailVerified={!!user.email_confirmed_at}
          createdAt={createdAt}
          isAdmin={isAdmin}
        />
      </section>

      {/* Module 2: My Articles */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">我的文章</h2>
          <Link href="/posts/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              新建文章
            </Button>
          </Link>
        </div>
        {postsError ? (
          <p className="text-sm text-destructive">加载失败: {postsError}</p>
        ) : (
          <MyPostRowList
            initialPosts={posts ?? []}
            initialTotal={count ?? 0}
            onLoadMore={loadMoreMyPosts}
            linkRef="profile"
          />
        )}
      </section>

      {/* Module 3: Guestbook Messages */}
      <section>
        <GuestbookSection
          toAuthorId={user.id}
          currentUserId={user.id}
          initialMessages={guestbookMessages}
          initialTotal={guestbookTotal}
          title="他人给我的留言"
        />
      </section>
    </div>
  )
}
