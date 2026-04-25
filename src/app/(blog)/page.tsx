import { PostList } from '@/components/blog/post-list'
import { SiteStats } from '@/components/blog/site-stats'
import { getSiteViewsCount, getSiteLikesCount } from '@/lib/db/queries'

export const revalidate = 300;

export default async function HomePage() {
  const siteTitle = process.env.NEXT_PUBLIC_SITE_TITLE ?? 'Blog'
  const { count: viewsCount } = await getSiteViewsCount()
  const { count: likesCount } = await getSiteLikesCount()

  return (
    <div className="space-y-8">
      <section className="text-center py-10 space-y-3">
        <img src="/logo.svg" alt="" className="h-16 w-16 mx-auto" />
        <h1 className="text-3xl font-bold">{siteTitle}</h1>
        <p className="text-muted-foreground">读一篇好文，少写十个Bug</p>
        <SiteStats initialViews={viewsCount} initialLikes={likesCount} />
      </section>
      <PostList />
    </div>
  )
}
