import { createClient } from '@/lib/supabase/server';
import { getSuperAdminUserIds } from '@/lib/utils/admin';
import { getSiteUrl } from '@/lib/site-url';

export interface SiteMeta {
  siteTitle: string;
  siteDescription: string;
  siteUrl: string;
  ogImage: string;
}

export async function getSiteMeta(): Promise<SiteMeta> {
  const siteTitle = process.env.NEXT_PUBLIC_SITE_TITLE ?? 'Blog';
  const siteUrl = await getSiteUrl();

  const adminIds = await getSuperAdminUserIds();
  let siteDescription = '';
  if (adminIds.length > 0) {
    const supabase = await createClient();
    const { data: adminSettings } = await supabase
      .from('user_settings')
      .select('motd')
      .eq('user_id', adminIds[0])
      .maybeSingle();
    siteDescription = adminSettings?.motd || '';
  }

  return {
    siteTitle,
    siteDescription,
    siteUrl,
    ogImage: `${siteUrl}/og-image.jpg`,
  };
}
