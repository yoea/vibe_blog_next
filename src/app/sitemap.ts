import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { routes } from './sitemap/sitemap-data';

const staticRouteOptions: Record<
  string,
  Pick<MetadataRoute.Sitemap[number], 'changeFrequency' | 'priority'>
> = {
  '/': { changeFrequency: 'daily', priority: 1 },
  '/about': { changeFrequency: 'monthly', priority: 0.6 },
  '/author': { changeFrequency: 'weekly', priority: 0.6 },
  '/legal': { changeFrequency: 'monthly', priority: 0.3 },
  '/privacy': { changeFrequency: 'monthly', priority: 0.3 },
  '/sitemap': { changeFrequency: 'monthly', priority: 0.4 },
  '/tags': { changeFrequency: 'weekly', priority: 0.6 },
};

function getSiteUrl() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    `http://localhost:${process.env.PORT || 3000}`;

  return siteUrl.replace(/\/+$/, '');
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  // Fetch all published posts
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from('posts')
    .select('slug, updated_at')
    .eq('published', true)
    .order('created_at', { ascending: false });

  const postEntries: MetadataRoute.Sitemap = (posts ?? []).map((post) => ({
    url: `${siteUrl}/posts/${encodeURIComponent(post.slug)}`,
    lastModified: post.updated_at,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // Fetch all tags
  const { data: tags } = await supabase
    .from('tags')
    .select('slug')
    .order('name');

  const tagEntries: MetadataRoute.Sitemap = (tags ?? []).map((tag) => ({
    url: `${siteUrl}/tags/${encodeURIComponent(tag.slug)}`,
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }));

  // Fetch all active authors (users who have published posts)
  const { data: authors } = await supabase
    .from('posts')
    .select('author_id')
    .eq('published', true)
    .not('author_id', 'is', null);

  const uniqueAuthorIds = [...new Set((authors ?? []).map((a) => a.author_id))];
  const authorEntries: MetadataRoute.Sitemap = uniqueAuthorIds.map((id) => ({
    url: `${siteUrl}/author/${id}`,
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }));

  const staticEntries: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${siteUrl}${route.path === '/' ? '' : route.path}`,
    lastModified,
    ...(staticRouteOptions[route.path] ?? {
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }),
  }));

  return [...staticEntries, ...postEntries, ...tagEntries, ...authorEntries];
}
