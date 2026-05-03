import { FileText } from 'lucide-react';
import { SiteStats } from './site-stats';
import {
  getSiteViewsCount,
  getSiteLikesCount,
  getTotalPostsCount,
} from '@/lib/db/queries';
import { createClient } from '@/lib/supabase/server';
import { getSuperAdminUserIds } from '@/lib/utils/admin';

export async function SiteHero() {
  const siteTitle = process.env.NEXT_PUBLIC_SITE_TITLE ?? 'Blog';
  const { count: viewsCount } = await getSiteViewsCount();
  const { count: likesCount } = await getSiteLikesCount();
  const { count: totalPosts } = await getTotalPostsCount();
  const supabase = await createClient();

  // 读取管理员的 MOTD 作为网站副标题，未设置则不显示
  const adminIds = await getSuperAdminUserIds();
  let siteDescription = '';
  if (adminIds.length > 0) {
    const { data: adminSettings } = await supabase
      .from('user_settings')
      .select('motd')
      .eq('user_id', adminIds[0])
      .maybeSingle();
    siteDescription = adminSettings?.motd || '';
  }

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
