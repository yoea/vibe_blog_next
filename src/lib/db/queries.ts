import { createClient } from '@/lib/supabase/server'
import type { PostWithAuthor, CommentWithAuthor, GuestbookMessageWithAuthor, Tag } from '@/lib/db/types'
import { headers } from 'next/headers'

// ── Helper: attach tags to an array of posts ──
async function attachTagsToPosts(posts: any[]) {
  if (posts.length === 0) return
  const supabase = await createClient()
  const postIds = posts.map((p: any) => p.id)
  const { data: postTags } = await supabase
    .from('post_tags')
    .select(`post_id, tag_id, tags(*)`)
    .in('post_id', postIds)

  const tagMap = new Map<string, Tag[]>()
  for (const pt of postTags ?? []) {
    const tag = pt.tags as unknown as Tag
    if (!tagMap.has(pt.post_id)) tagMap.set(pt.post_id, [])
    tagMap.get(pt.post_id)!.push(tag)
  }
  for (const post of posts) {
    (post as any).tags = tagMap.get(post.id) ?? []
  }
}

export async function getPublishedPosts(page = 1, limit = 10) {
  const supabase = await createClient()
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await supabase
    .from('posts')
    .select(
      `
      id, author_id, title, slug, content, excerpt, published, is_pinned, created_at, updated_at,
      like_count:post_likes(count),
      comment_count:post_comments(count)
    `,
      { count: 'exact' }
    )
    .eq('published', true)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return { data: [], count: 0, error: error.message }

  const authorIds = [...new Set(data.map((item: any) => item.author_id))]
  const { data: userSettings } = await supabase
    .from('user_settings')
    .select('user_id, display_name, avatar_url')
    .in('user_id', authorIds)
  const authorMap = new Map((userSettings ?? []).map((s) => [s.user_id, { name: s.display_name, avatar_url: s.avatar_url ?? null }]))

  const result = data.map((item: any) => ({
    ...item,
    author: {
      name: authorMap.get(item.author_id)?.name ?? item.author_id?.slice(0, 8),
      avatar_url: authorMap.get(item.author_id)?.avatar_url ?? null,
    },
    like_count: item.like_count?.[0]?.count ?? 0,
    comment_count: item.comment_count?.[0]?.count ?? 0,
  })) as unknown as PostWithAuthor[]

  await attachTagsToPosts(result)

  return { data: result, count, error: null }
}

export async function getPostBySlug(slug: string) {
  const supabase = await createClient()

  // Fetch user and post in parallel
  const [{ data: { user } }, { data: post, error: postError }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('posts').select('*').eq('slug', slug).single(),
  ])

  if (postError) return { data: null, error: postError.message }
  if (!post) return { data: null, error: '文章不存在' }

  // Allow viewing own draft posts
  if (!post.published && (!user || user.id !== post.author_id)) {
    return { data: null, error: '文章不存在' }
  }

  // Fetch author settings, like count, comment count, user/IP like check, draft, and tags in parallel
  const [authorSettingsResult, { count: likeCount }, commentCountResult, userLikeResult, draftResult, tagsResult] = await Promise.all([
    supabase.from('user_settings').select('display_name, avatar_url').eq('user_id', post.author_id).maybeSingle(),
    supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
    supabase.from('post_comments').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
    // For authenticated users, check their like
    user
      ? supabase.from('post_likes').select('id').eq('post_id', post.id).eq('user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    // Draft data (only for the post author)
    user && user.id === post.author_id
      ? supabase.from('post_drafts').select('title, content, excerpt, updated_at').eq('post_id', post.id).maybeSingle()
      : Promise.resolve({ data: null }),
    // Tags
    supabase.from('post_tags').select(`tag_id, tags(*)`).eq('post_id', post.id),
  ])

  // For unauthenticated users, check IP-based like
  let ipLike = false
  if (!user) {
    const h = await headers()
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? h.get('x-real-ip')
      ?? null
    if (ip && ip !== 'unknown') {
      const { data: ipData } = await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', post.id)
        .eq('ip', ip)
        .maybeSingle()
      ipLike = !!ipData
    }
  }

  const commentCount = commentCountResult.count ?? 0
  const tags = (tagsResult?.data ?? []).map((pt: any) => pt.tags as Tag).filter(Boolean)

  const result = {
    ...post,
    author: {
      email: null,
      name: authorSettingsResult.data?.display_name ?? null,
      avatar_url: authorSettingsResult.data?.avatar_url ?? null,
    },
    like_count: likeCount ?? 0,
    comment_count: commentCount,
    is_liked_by_current_user: !!userLikeResult?.data || ipLike,
    tags,
    // Attach draft data if the current user is the author
    ...(draftResult?.data ? {
      draft_title: draftResult.data.title,
      draft_content: draftResult.data.content,
      draft_excerpt: draftResult.data.excerpt,
      draft_updated_at: draftResult.data.updated_at,
    } : {}),
  } as unknown as PostWithAuthor

  return { data: result, error: null }
}

export async function getCommentsForPost(postId: string, options?: { page?: number; pageSize?: number }) {
  const supabase = await createClient()
  const { page = 1, pageSize = 10 } = options ?? {}

  // Fetch user, count, and top-level comments in parallel
  const results = await Promise.all([
    supabase.auth.getUser() as any,
    supabase
      .from('post_comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
      .is('parent_id', null),
    supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', postId)
      .is('parent_id', null)
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, (page - 1) * pageSize + pageSize - 1),
  ])

  const user = results[0]?.data?.user ?? null
  const total = results[1]?.count ?? 0
  const { data: topLevelComments, error } = results[2] ?? { data: null, error: null }

  if (error) return { data: [], total: 0, error: error.message }
  if (!topLevelComments?.length) return { data: [], total, error: null }

  // Fetch direct replies (1 level) for these top-level comments
  const topLevelIds = topLevelComments.map((c) => c.id)
  const allComments = [...topLevelComments]

  const { data: replies } = await supabase
    .from('post_comments')
    .select('*')
    .in('parent_id', topLevelIds)
    .order('created_at', { ascending: true })
  if (replies?.length) {
    allComments.push(...replies)
  }

  // Fetch author display names and comment likes in parallel
  const commentIds = allComments.map((c) => c.id)
  const authorIds = [...new Set(allComments.map((c) => c.author_id).filter(Boolean))]
  const settingsMap = new Map<string, { display_name: string | null; avatar_url: string | null }>()
  const likeCountMap = new Map<string, number>()
  const userLikedMap = new Map<string, boolean>()

  await Promise.all([
    (async () => {
      if (authorIds.length === 0) return
      const { data: settings } = await supabase
        .from('user_settings')
        .select('user_id, display_name, avatar_url')
        .in('user_id', authorIds)
      if (settings) {
        for (const s of settings) {
          settingsMap.set(s.user_id, { display_name: s.display_name ?? null, avatar_url: s.avatar_url ?? null })
        }
      }
    })(),
    (async () => {
      if (commentIds.length === 0) return
      const { data: likes } = await supabase
        .from('comment_likes')
        .select('comment_id, user_id, ip')
        .in('comment_id', commentIds)
      if (likes) {
        for (const l of likes) {
          likeCountMap.set(l.comment_id, (likeCountMap.get(l.comment_id) ?? 0) + 1)
          if (user && l.user_id === user.id) {
            userLikedMap.set(l.comment_id, true)
          }
        }
        // For anonymous users, check by IP
        if (!user) {
          const h = await headers()
          const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim()
            ?? h.get('x-real-ip')
            ?? null
          if (ip && ip !== 'unknown') {
            for (const l of likes) {
              if (l.ip === ip) {
                userLikedMap.set(l.comment_id, true)
              }
            }
          }
        }
      }
    })(),
  ])

  const enrich = (item: any): CommentWithAuthor => ({
    ...item,
    parent_id: item.parent_id ?? null,
    author_email: item.author_email ?? null,
    author: item.author_id
      ? {
          email: null,
          display_name: settingsMap.get(item.author_id)?.display_name ?? null,
          avatar_url: settingsMap.get(item.author_id)?.avatar_url ?? null,
        }
      : {
          email: null,
          display_name: item.guest_name ?? '匿名游客',
          avatar_url: null,
        },
    like_count: likeCountMap.get(item.id) ?? 0,
    is_liked: userLikedMap.has(item.id),
    replies: [],
  })

  // Build 1-level tree: top-level items with flat replies array
  const topLevel: CommentWithAuthor[] = []
  const repliesMap = new Map<string, CommentWithAuthor[]>()

  for (const item of allComments) {
    const enriched = enrich(item)
    if (item.parent_id && topLevelIds.includes(item.parent_id)) {
      if (!repliesMap.has(item.parent_id)) repliesMap.set(item.parent_id, [])
      repliesMap.get(item.parent_id)!.push(enriched)
    } else if (!item.parent_id) {
      topLevel.push(enriched)
    }
  }

  for (const parent of topLevel) {
    parent.replies = repliesMap.get(parent.id) ?? []
  }

  return { data: topLevel, total: total ?? 0, error: null }
}

export async function getGuestbookMessages(toAuthorId: string, options?: { page?: number; pageSize?: number }) {
  const supabase = await createClient()
  const { page = 1, pageSize = 10 } = options ?? {}

  // Count all messages (for stats display)
  const { count: fullTotal } = await supabase
    .from('guestbook_messages')
    .select('*', { count: 'exact', head: true })
    .eq('to_author_id', toAuthorId)

  // Count top-level messages (for pagination)
  const { count: total } = await supabase
    .from('guestbook_messages')
    .select('*', { count: 'exact', head: true })
    .eq('to_author_id', toAuthorId)
    .is('parent_id', null)

  // Fetch top-level messages for this page
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const { data: topLevel, error } = await supabase
    .from('guestbook_messages')
    .select('*')
    .eq('to_author_id', toAuthorId)
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return { data: [], total: 0, fullTotal: 0, error: error.message }
  if (!topLevel?.length) return { data: [], total: total ?? 0, error: null }

  // Fetch direct replies (1 level) for these top-level messages
  const topLevelIds = topLevel.map((m) => m.id)
  const allMessages = [...topLevel]

  const { data: replies } = await supabase
    .from('guestbook_messages')
    .select('*')
    .in('parent_id', topLevelIds)
    .order('created_at', { ascending: true })
  if (replies?.length) {
    allMessages.push(...replies)
  }

  // Fetch author display names
  const authorIds = [...new Set(allMessages.map((m) => m.author_id).filter(Boolean))]
  const settingsMap = new Map<string, { display_name: string | null; avatar_url: string | null }>()
  if (authorIds.length > 0) {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('user_id, display_name, avatar_url')
      .in('user_id', authorIds)
    if (settings) {
      for (const s of settings) {
        settingsMap.set(s.user_id, { display_name: s.display_name ?? null, avatar_url: s.avatar_url ?? null })
      }
    }
  }

  const enrich = (m: any): GuestbookMessageWithAuthor => ({
    ...m,
    parent_id: m.parent_id ?? null,
    author_email: m.author_email ?? null,
    author: m.author_id
      ? {
          display_name: settingsMap.get(m.author_id)?.display_name ?? null,
          avatar_url: settingsMap.get(m.author_id)?.avatar_url ?? null,
        }
      : {
          display_name: m.guest_name ?? '匿名游客',
          avatar_url: null,
        },
    replies: [],
  })

  // Build 1-level tree
  const result: GuestbookMessageWithAuthor[] = []
  const repliesMap = new Map<string, GuestbookMessageWithAuthor[]>()

  for (const item of allMessages) {
    const enriched = enrich(item)
    if (item.parent_id && topLevelIds.includes(item.parent_id)) {
      if (!repliesMap.has(item.parent_id)) repliesMap.set(item.parent_id, [])
      repliesMap.get(item.parent_id)!.push(enriched)
    } else if (!item.parent_id) {
      result.push(enriched)
    }
  }

  for (const parent of result) {
    parent.replies = repliesMap.get(parent.id) ?? []
  }

  return { data: result, total: total ?? 0, fullTotal: fullTotal ?? 0, error: null }
}

export async function getPostsByAuthor(authorId: string, page = 1, limit = 10) {
  const supabase = await createClient()
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await supabase
    .from('posts')
    .select(`
      *,
      like_count:post_likes(count),
      comment_count:post_comments(count)
    `, { count: 'exact' })
    .eq('author_id', authorId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return { data: [], count: 0, error: error.message }
  const mapped = (data ?? []).map((p: any) => ({
    ...p,
    like_count: p.like_count?.[0]?.count ?? 0,
    comment_count: p.comment_count?.[0]?.count ?? 0,
  }))
  await attachTagsToPosts(mapped)
  return { data: mapped, count, error: null }
}

export async function getUserSettings(userId?: string) {
  const supabase = await createClient()
  const uid = userId ?? (await supabase.auth.getUser()).data.user?.id
  if (!uid) return { data: null, error: '未登录' }

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', uid)
    .maybeSingle()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function getSiteViewsCount() {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('site_views')
    .select('*', { count: 'exact', head: true })
  return { count: count ?? 0, error: error?.message ?? null }
}

export async function getSiteLikesCount() {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('site_likes')
    .select('*', { count: 'exact', head: true })
  return { count: count ?? 0, error: error?.message ?? null }
}

export async function getTotalPostsCount() {
  const supabase = await createClient()
  const { count, error } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
  return { count: count ?? 0, error: error?.message ?? null }
}

export async function getAllUsers(page = 1, limit = 20) {
  const supabase = await createClient()

  // Count total users with settings
  const { count: total } = await supabase
    .from('user_settings')
    .select('*', { count: 'exact', head: true })

  const from = (page - 1) * limit
  const to = from + limit - 1

  // Fetch user settings with post counts
  const { data: settings, error } = await supabase
    .from('user_settings')
    .select('user_id, display_name, avatar_url, github_id, is_deleted, deleted_at, created_at')
    .order('is_deleted', { ascending: true })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return { data: [], count: 0, error: error.message }

  // Fetch post counts for these users
  const userIds = (settings ?? []).map((s) => s.user_id)
  const postCountMap = new Map<string, number>()
  if (userIds.length > 0) {
    const { data: posts } = await supabase
      .from('posts')
      .select('author_id')
      .eq('published', true)
      .in('author_id', userIds)
    if (posts) {
      for (const p of posts) {
        postCountMap.set(p.author_id, (postCountMap.get(p.author_id) ?? 0) + 1)
      }
    }
  }

  return {
    data: (settings ?? []).map((s) => ({
      id: s.user_id,
      displayName: s.display_name ?? '',
      avatarUrl: s.avatar_url ?? null,
      githubId: s.github_id ?? null,
      createdAt: s.created_at,
      postCount: postCountMap.get(s.user_id) ?? 0,
      isDeleted: s.is_deleted ?? false,
      deletedAt: s.deleted_at ?? null,
    })),
    count: total ?? 0,
    hasMore: (total ?? 0) > to + 1,
    error: null,
  }
}

export async function searchPosts(query: string, page = 1, limit = 20) {
  const supabase = await createClient()
  const from = (page - 1) * limit
  const to = from + limit - 1
  const pattern = `%${query}%`

  const { data, error, count } = await supabase
    .from('posts')
    .select(
      `
      id, author_id, title, slug, content, excerpt, published, is_pinned, created_at, updated_at,
      like_count:post_likes(count),
      comment_count:post_comments(count)
    `,
      { count: 'exact' }
    )
    .eq('published', true)
    .or(`title.ilike.${pattern},content.ilike.${pattern}`)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return { data: [], count: 0, error: error.message }

  const authorIds = [...new Set(data.map((item: any) => item.author_id))]
  const { data: userSettings } = await supabase
    .from('user_settings')
    .select('user_id, display_name, avatar_url')
    .in('user_id', authorIds)
  const authorMap = new Map((userSettings ?? []).map((s) => [s.user_id, { name: s.display_name, avatar_url: s.avatar_url ?? null }]))

  const result = data.map((item: any) => ({
    ...item,
    author: {
      name: authorMap.get(item.author_id)?.name ?? item.author_id?.slice(0, 8),
      avatar_url: authorMap.get(item.author_id)?.avatar_url ?? null,
    },
    like_count: item.like_count?.[0]?.count ?? 0,
    comment_count: item.comment_count?.[0]?.count ?? 0,
  })) as unknown as PostWithAuthor[]

  await attachTagsToPosts(result)

  return { data: result, count, error: null }
}

export async function getTagsForPost(postId: string): Promise<Tag[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('post_tags')
    .select(`tag_id, tags(*)`)
    .eq('post_id', postId)
  return (data ?? []).map((pt: any) => pt.tags as Tag).filter(Boolean)
}

export async function getAllTags(): Promise<{ name: string; slug: string; color: string | null; post_count: number }[]> {
  const supabase = await createClient()
  const { data: tags } = await supabase.from('tags').select('id, name, slug, color').order('name', { ascending: true })
  if (!tags?.length) return []

  const tagIds = tags.map((t) => t.id)
  const { data: postTags } = await supabase
    .from('post_tags')
    .select('tag_id')
    .in('tag_id', tagIds)

  const countMap = new Map<string, number>()
  for (const pt of postTags ?? []) {
    countMap.set(pt.tag_id, (countMap.get(pt.tag_id) ?? 0) + 1)
  }

  return tags.map((t) => ({
    name: t.name,
    slug: t.slug,
    color: t.color ?? null,
    post_count: countMap.get(t.id) ?? 0,
  }))
}

export async function getTopTags(limit = 10): Promise<{ name: string; slug: string; color: string | null; post_count: number }[]> {
  const all = await getAllTags()
  return all.sort((a, b) => b.post_count - a.post_count).slice(0, limit)
}

export async function getPostsByTag(tagSlug: string, page = 1, limit = 10) {
  try {
    const supabase = await createClient()

    // Find the tag
    const { data: tag, error: tagError } = await supabase
      .from('tags')
      .select('id, name, color')
      .eq('slug', tagSlug)
      .single()

    if (tagError || !tag) {
      return { data: [], count: 0, tagName: '', tagColor: '', error: `标签查询失败: ${tagError?.message ?? '标签不存在'}` }
    }

    // Get all post IDs for this tag
    const { data: postTags } = await supabase
      .from('post_tags')
      .select('post_id')
      .eq('tag_id', tag.id)

    if (!postTags?.length) return { data: [], count: 0, tagName: tag.name, tagColor: tag.color ?? null, error: null }

    const postIds = postTags.map((pt) => pt.post_id)
    const from = (page - 1) * limit
    const to = from + limit - 1

    // Count total published posts with this tag
    const { count: total, error: countError } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('published', true)
      .in('id', postIds)

    if (countError) return { data: [], count: 0, tagName: tag.name, tagColor: tag.color ?? null, error: `计数失败: ${countError.message}` }

    // Fetch published posts with this tag, ordered and paginated
    const { data: posts, error } = await supabase
      .from('posts')
      .select(`
        id, author_id, title, slug, content, excerpt, published, is_pinned, created_at, updated_at,
        like_count:post_likes(count),
        comment_count:post_comments(count)
      `)
      .in('id', postIds)
      .eq('published', true)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) return { data: [], count: 0, tagName: tag.name, tagColor: tag.color ?? null, error: `文章查询失败: ${error.message}` }

    if (!posts?.length) return { data: [], count: 0, tagName: tag.name, tagColor: tag.color ?? null, error: null }

    // Map author info
    const authorIds = [...new Set(posts.map((item: any) => item.author_id))]
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('user_id, display_name, avatar_url')
      .in('user_id', authorIds)
    const authorMap = new Map((userSettings ?? []).map((s: any) => [s.user_id, { name: s.display_name, avatar_url: s.avatar_url ?? null }]))

    const result = posts.map((item: any) => ({
      ...item,
      author: {
        name: authorMap.get(item.author_id)?.name ?? item.author_id?.slice(0, 8),
        avatar_url: authorMap.get(item.author_id)?.avatar_url ?? null,
      },
      like_count: item.like_count?.[0]?.count ?? 0,
      comment_count: item.comment_count?.[0]?.count ?? 0,
    })) as unknown as PostWithAuthor[]

    await attachTagsToPosts(result)

    return { data: result, count: total ?? 0, tagName: tag.name, tagColor: tag.color ?? null, error: null }
  } catch (e: any) {
    return { data: [], count: 0, tagName: '', error: `异常: ${e?.message ?? e}` }
  }
}

export interface TagWithCreator {
  id: string
  name: string
  slug: string
  color: string
  created_at: string
  created_by: string | null
  author_name: string | null
  author_email: string | null
  post_count: number
}

export async function getAllTagsWithCounts(): Promise<TagWithCreator[]> {
  const supabase = await createClient()
  const { data: tags } = await supabase
    .from('tags')
    .select('id, name, slug, color, created_at, created_by')
    .order('created_at', { ascending: false })
  if (!tags?.length) return []

  const tagIds = tags.map((t) => t.id)
  const { data: postTags } = await supabase
    .from('post_tags')
    .select('tag_id')
    .in('tag_id', tagIds)

  const countMap = new Map<string, number>()
  for (const pt of postTags ?? []) {
    countMap.set(pt.tag_id, (countMap.get(pt.tag_id) ?? 0) + 1)
  }

  const authorIds = tags.map((t) => t.created_by).filter(Boolean) as string[]
  const authorMap = new Map<string, { name: string | null; email: string | null }>()
  if (authorIds.length > 0) {
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('user_id, display_name')
      .in('user_id', authorIds)
    for (const s of userSettings ?? []) {
      authorMap.set(s.user_id, { name: s.display_name, email: null })
    }
    const { data: users } = await supabase.auth.admin.listUsers()
    for (const u of users?.users ?? []) {
      const existing = authorMap.get(u.id)
      if (existing) existing.email = u.email ?? null
      else authorMap.set(u.id, { name: null, email: u.email ?? null })
    }
  }

  return tags.map((t) => {
    const author = t.created_by ? authorMap.get(t.created_by) : null
    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      color: t.color ?? '#3B82F6',
      created_at: t.created_at,
      created_by: t.created_by,
      author_name: author?.name ?? null,
      author_email: author?.email ?? null,
      post_count: countMap.get(t.id) ?? 0,
    }
  })
}

export async function getTagsByUser(userId: string): Promise<TagWithCreator[]> {
  const supabase = await createClient()
  const { data: tags } = await supabase
    .from('tags')
    .select('id, name, slug, color, created_at, created_by')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
  if (!tags?.length) return []

  const tagIds = tags.map((t) => t.id)
  const { data: postTags } = await supabase
    .from('post_tags')
    .select('tag_id')
    .in('tag_id', tagIds)

  const countMap = new Map<string, number>()
  for (const pt of postTags ?? []) {
    countMap.set(pt.tag_id, (countMap.get(pt.tag_id) ?? 0) + 1)
  }

  const { data: userSetting } = await supabase
    .from('user_settings')
    .select('display_name')
    .eq('user_id', userId)
    .maybeSingle()

  const authorName = userSetting?.display_name ?? null

  return tags.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    color: t.color ?? '#3B82F6',
    created_at: t.created_at,
    created_by: t.created_by,
    author_name: authorName,
    author_email: null,
    post_count: countMap.get(t.id) ?? 0,
  }))
}