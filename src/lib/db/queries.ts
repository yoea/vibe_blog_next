import { createClient } from '@/lib/supabase/server'
import type { PostWithAuthor, CommentWithAuthor, GuestbookMessageWithAuthor } from '@/lib/db/types'
import { headers } from 'next/headers'

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

  // Fetch author settings, like count, comment count, user/IP like check, and draft in parallel
  const [authorSettingsResult, { count: likeCount }, commentCountResult, userLikeResult, draftResult] = await Promise.all([
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

  // Fetch all replies for these top-level comments (2 levels deep)
  const topLevelIds = topLevelComments.map((c) => c.id)
  const allComments = [...topLevelComments]
  const replyIds: string[] = []

  const { data: replies1 } = await supabase
    .from('post_comments')
    .select('*')
    .in('parent_id', topLevelIds)
    .order('created_at', { ascending: true })
  if (replies1?.length) {
    allComments.push(...replies1)
    replyIds.push(...replies1.map((c) => c.id))
  }

  if (replyIds.length > 0) {
    const { data: replies2 } = await supabase
      .from('post_comments')
      .select('*')
      .in('parent_id', replyIds)
      .order('created_at', { ascending: true })
    if (replies2?.length) {
      allComments.push(...replies2)
    }
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

  // Build tree
  const topLevel: CommentWithAuthor[] = []
  const repliesMap = new Map<string, CommentWithAuthor[]>()

  for (const item of allComments) {
    const enriched = enrich(item)
    if (item.parent_id) {
      let topParentId = item.parent_id
      const visited = new Set<string>()
      while (topParentId && !visited.has(topParentId)) {
        visited.add(topParentId)
        const parent = allComments.find((c) => c.id === topParentId)
        if (!parent || !parent.parent_id) break
        topParentId = parent.parent_id
      }
      if (!repliesMap.has(topParentId)) repliesMap.set(topParentId, [])
      repliesMap.get(topParentId)!.push(enriched)
    } else {
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

  // Fetch all replies for these top-level messages
  const topLevelIds = topLevel.map((m) => m.id)
  const allMessages = [...topLevel]
  const replyIds: string[] = []

  const { data: replies1 } = await supabase
    .from('guestbook_messages')
    .select('*')
    .in('parent_id', topLevelIds)
    .order('created_at', { ascending: true })
  if (replies1?.length) {
    allMessages.push(...replies1)
    replyIds.push(...replies1.map((m) => m.id))
  }

  if (replyIds.length > 0) {
    const { data: replies2 } = await supabase
      .from('guestbook_messages')
      .select('*')
      .in('parent_id', replyIds)
      .order('created_at', { ascending: true })
    if (replies2?.length) {
      allMessages.push(...replies2)
    }
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

  // Build tree
  const result: GuestbookMessageWithAuthor[] = []
  const repliesMap = new Map<string, GuestbookMessageWithAuthor[]>()

  for (const item of allMessages) {
    const enriched = enrich(item)
    if (item.parent_id) {
      let topParentId = item.parent_id
      const visited = new Set<string>()
      while (topParentId && !visited.has(topParentId)) {
        visited.add(topParentId)
        const parent = allMessages.find((m) => m.id === topParentId)
        if (!parent || !parent.parent_id) break
        topParentId = parent.parent_id
      }
      if (!repliesMap.has(topParentId)) repliesMap.set(topParentId, [])
      repliesMap.get(topParentId)!.push(enriched)
    } else {
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
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return { data: [], count: 0, error: error.message }
  const mapped = (data ?? []).map((p: any) => ({
    ...p,
    like_count: p.like_count?.[0]?.count ?? 0,
    comment_count: p.comment_count?.[0]?.count ?? 0,
  }))
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
    .select('user_id, display_name, avatar_url, is_deleted, deleted_at, created_at')
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
