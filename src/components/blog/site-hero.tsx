import { FileText } from 'lucide-react';
import { SiteStats } from './site-stats';
import {
  getSiteViewsCount,
  getSiteLikesCount,
  getTotalPostsCount,
} from '@/lib/db/queries';
import { getSiteMeta } from '@/lib/utils/site-meta';

export async function SiteHero() {
  const { siteTitle, siteDescription } = await getSiteMeta();
  const { count: viewsCount } = await getSiteViewsCount();
  const { count: likesCount } = await getSiteLikesCount();
  const { count: totalPosts } = await getTotalPostsCount();

  return (
    <section className="text-center py-6 space-y-2 mb-4">
      <h1 className="text-2xl font-bold">{siteTitle}</h1>
      {siteDescription && (
        <p className="text-muted-foreground text-sm">{siteDescription}</p>
      )}

      <div className="flex items-center justify-center gap-4 text-muted-foreground select-none">
        <SiteStats initialViews={viewsCount} initialLikes={likesCount} />
        <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium">
          <FileText className="h-3.5 w-3.5" />
          <span>{totalPosts}</span>
        </div>
      </div>
    </section>
  );
}
