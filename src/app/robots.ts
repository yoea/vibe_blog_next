import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    `http://localhost:${process.env.PORT || 3000}`;

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/posts-edit/', '/login', '/register'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
