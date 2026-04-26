import { FileText } from 'lucide-react'
import { SiteStats } from './site-stats'
import { getSiteViewsCount, getSiteLikesCount, getTotalPostsCount } from '@/lib/db/queries'

export async function SiteHero() {
  const siteTitle = process.env.NEXT_PUBLIC_SITE_TITLE ?? 'Blog'
  const { count: viewsCount } = await getSiteViewsCount()
  const { count: likesCount } = await getSiteLikesCount()
  const { count: totalPosts } = await getTotalPostsCount()

  return (
    <section className="text-center py-10 space-y-3 mb-8 md:mb-0">
      <img src="/logo.svg" alt="" className="h-16 w-16 mx-auto" />
      <h1 className="text-3xl font-bold">{siteTitle}</h1>
      <p className="text-muted-foreground">读一篇好文，少写十个Bug</p>

      <div className="flex items-center justify-center gap-4 text-muted-foreground select-none">
        <SiteStats initialViews={viewsCount} initialLikes={likesCount} />
        <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium">
          <FileText className="h-3.5 w-3.5" />
          <span>{totalPosts}</span>
        </div>
      </div>
    </section>
  )
}
