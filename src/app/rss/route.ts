import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `http://localhost:${process.env.PORT || 3000}`
  const siteTitle = process.env.NEXT_PUBLIC_SITE_TITLE ?? 'Blog'
  const siteDescription = process.env.NEXT_PUBLIC_SITE_DESCRIPTION ?? ''

  const supabase = await createClient()
  const { data: posts } = await supabase
    .from('posts')
    .select('title, slug, excerpt, created_at, updated_at')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(50)

  const items = (posts ?? [])
    .map(
      (post) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${siteUrl}/posts/${post.slug}</link>
      <guid>${siteUrl}/posts/${post.slug}</guid>
      <description><![CDATA[${post.excerpt ?? ''}]]></description>
      <pubDate>${new Date(post.created_at).toUTCString()}</pubDate>
    </item>`
    )
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${siteTitle}</title>
    <link>${siteUrl}</link>
    <description>${siteDescription}</description>
    <language>zh-CN</language>
    <atom:link href="${siteUrl}/rss" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
