import { createClient } from '@/lib/supabase/server'
import type { PostWithAuthor, CommentWithAuthor } from '@/lib/db/types'
import { headers } from 'next/headers'

export async function getPublishedPosts(page = 1, limit = 10) {
  const supabase = await createClient()
  const from = (page - 1) * limit
  const to = from + limit - 1

  const { data, error, count } = await supabase
    .from('posts')
    .select(
      `
      id, author_id, title, slug, content, excerpt, published, created_at, updated_at,
      like_count:post_likes(count),
      comment_count:post_comments(count)
    `,
      { count: 'exact' }
    )
    .eq('published', true)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return { data: [], count: 0, error: error.message }

  const result = data.map((item: any) => ({
    ...item,
    author: { email: null },
    like_count: item.like_count?.[0]?.count ?? 0,
    comment_count: item.comment_count?.[0]?.count ?? 0,
  })) as unknown as PostWithAuthor[]

  return { data: result, count, error: null }
}

export async function getPostBySlug(slug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .single()

  if (postError) return { data: null, error: postError.message }
  if (!post) return { data: null, error: '文章不存在' }

  // Allow viewing own draft posts
  if (!post.published && (!user || user.id !== post.author_id)) {
    return { data: null, error: '文章不存在' }
  }

  // Fetch author display name
  const { data: authorSettings } = await supabase
    .from('user_settings')
    .select('display_name')
    .eq('user_id', post.author_id)
    .maybeSingle()

  const { count: likeCount } = await supabase
    .from('post_likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', post.id)

  const { data: userLike } = user
    ? await supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', post.id)
        .eq('user_id', user.id)
        .maybeSingle()
    : { data: null }

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

  const { count: commentCount } = await supabase
    .from('post_comments')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', post.id)

  const result = {
    ...post,
    author: {
      email: null,
      name: authorSettings?.display_name ?? null,
    },
    like_count: likeCount ?? 0,
    comment_count: commentCount ?? 0,
    is_liked_by_current_user: !!userLike || ipLike,
  } as unknown as PostWithAuthor

  return { data: result, error: null }
}

export async function getCommentsForPost(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: comments, error } = await supabase
    .from('post_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error) return { data: [], error: error.message }

  // Fetch display names for all comment authors
  const authorIds = [...new Set(comments.map((c) => c.author_id))]
  let settingsMap = new Map<string, string>()
  if (authorIds.length > 0) {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('user_id, display_name')
      .in('user_id', authorIds)

    if (settings) {
      for (const s of settings) {
        if (s.display_name) settingsMap.set(s.user_id, s.display_name)
      }
    }
  }

  // Fetch like counts for all comments
  const commentIds = comments.map((c) => c.id)
  const likeCountMap = new Map<string, number>()
  const userLikedMap = new Map<string, boolean>()

  if (commentIds.length > 0) {
    const { data: likes } = await supabase
      .from('comment_likes')
      .select('comment_id, user_id')
      .in('comment_id', commentIds)

    if (likes) {
      for (const l of likes) {
        likeCountMap.set(l.comment_id, (likeCountMap.get(l.comment_id) ?? 0) + 1)
        if (user && l.user_id === user.id) {
          userLikedMap.set(l.comment_id, true)
        }
      }
    }
  }

  // Map to enriched comments
  const enrich = (item: any): CommentWithAuthor => ({
    ...item,
    parent_id: item.parent_id ?? null,
    author_email: item.author_email ?? null,
    author: {
      email: null,
      display_name: settingsMap.get(item.author_id) ?? null,
    },
    like_count: likeCountMap.get(item.id) ?? 0,
    is_liked: userLikedMap.has(item.id),
    replies: [],
  })

  // Separate top-level and replies
  const topLevel: CommentWithAuthor[] = []
  const repliesMap = new Map<string, CommentWithAuthor[]>()

  for (const item of comments) {
    const enriched = enrich(item)
    if (item.parent_id) {
      // Walk up to find the top-level parent
      let topParentId = item.parent_id
      const visited = new Set<string>()
      while (topParentId && !visited.has(topParentId)) {
        visited.add(topParentId)
        const parent = comments.find((c) => c.id === topParentId)
        if (!parent || !parent.parent_id) break
        topParentId = parent.parent_id
      }
      if (!repliesMap.has(topParentId)) repliesMap.set(topParentId, [])
      repliesMap.get(topParentId)!.push(enriched)
    } else {
      topLevel.push(enriched)
    }
  }

  // Attach replies to parents
  for (const parent of topLevel) {
    parent.replies = repliesMap.get(parent.id) ?? []
  }

  return { data: topLevel, error: null }
}

export async function getPostsByAuthor(authorId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('author_id', authorId)
    .order('created_at', { ascending: false })

  if (error) return { data: [], error: error.message }
  return { data, error: null }
}

export async function getUserSettings() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: '未登录' }

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return { data: null, error: error.message }
  return { data: { ...data, email: user.email, created_at: user.created_at }, error: null }
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

export async function getAllUsers() {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const supabase = createAdminClient()

  const { data: { users }, error } = await supabase.auth.admin.listUsers()
  if (error) return { data: [], error: error.message }

  // Fetch display names from user_settings
  const userIds = users.map((u) => u.id)
  const settingsMap = new Map<string, string>()
  const postCountMap = new Map<string, number>()
  if (userIds.length > 0) {
    const db = await createClient()
    const { data: settings } = await db
      .from('user_settings')
      .select('user_id, display_name, updated_at')
      .in('user_id', userIds)
    if (settings) {
      for (const s of settings) {
        settingsMap.set(s.user_id, s.display_name ?? '')
      }
    }

    const { data: posts } = await db
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

  const oneMonthAgo = Date.now() - 30 * 86400000

  return {
    data: users.map((u) => {
      const displayName = settingsMap.get(u.id) || u.email?.split('@')[0] || ''
      const isDeleted = displayName === '已注销用户'
      return {
        id: u.id,
        email: u.email ?? '',
        displayName,
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in_at ?? null,
        isActive: !isDeleted && u.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() > oneMonthAgo : false,
        isDeleted,
        postCount: postCountMap.get(u.id) ?? 0,
      }
    }).sort((a, b) => {
      // Deleted users at the bottom
      if (a.isDeleted !== b.isDeleted) return a.isDeleted ? 1 : -1
      // Then sort by post count desc
      return b.postCount - a.postCount
    }),
    error: null,
  }
}
