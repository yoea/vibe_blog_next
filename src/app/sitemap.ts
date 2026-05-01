import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `http://localhost:${process.env.PORT || 3000}`

  // Fetch all published posts
  const supabase = await createClient()
  const { data: posts } = await supabase
    .from('posts')
    .select('slug, updated_at')
    .eq('published', true)
    .order('created_at', { ascending: false })

  const postEntries: MetadataRoute.Sitemap = (posts ?? []).map((post) => ({
    url: `${siteUrl}/posts/${post.slug}`,
    lastModified: post.updated_at,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // Fetch all tags
  const { data: tags } = await supabase
    .from('tags')
    .select('slug')
    .order('name')

  const tagEntries: MetadataRoute.Sitemap = (tags ?? []).map((tag) => ({
    url: `${siteUrl}/tags/${encodeURIComponent(tag.slug)}`,
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }))

  // Fetch all active authors (users who have published posts)
  const { data: authors } = await supabase
    .from('posts')
    .select('author_id')
    .eq('published', true)
    .not('author_id', 'is', null)

  const uniqueAuthorIds = [...new Set((authors ?? []).map((a) => a.author_id))]
  const authorEntries: MetadataRoute.Sitemap = uniqueAuthorIds.map((id) => ({
    url: `${siteUrl}/author/${id}`,
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }))

  // Static pages
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${siteUrl}/author`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${siteUrl}/legal`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    ...postEntries,
    ...tagEntries,
    ...authorEntries,
  ]
}
