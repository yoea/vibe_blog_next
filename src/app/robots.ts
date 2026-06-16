import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/utils/site-url';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteUrl = await getSiteUrl();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/posts-edit/', '/login', '/register'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
