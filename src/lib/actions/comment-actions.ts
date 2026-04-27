'use server'

import { createClient } from '@/lib/supabase/server'
import { getCommentsForPost } from '@/lib/db/queries'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { checkIpRateLimit } from '@/lib/utils/rate-limit'
import type { ActionResult } from '@/lib/db/types'

async function getPostSlug(supabase: any, postId: string): Promise<string | null> {
  const { data } = await supabase.from('posts').select('slug').eq('id', postId).single()
  return data?.slug ?? null
}

export async function createComment(
  postId: string,
  content: string,
  parentId?: string,
  guestName?: string
): Promise<ActionResult & { data?: any }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!content.trim()) return { error: '评论内容不能为空' }
  if (content.trim().length > 500) return { error: '评论内容不能超过 500 个字符' }

  const insertData: any = {
    post_id: postId,
    content: content.trim(),
  }

  if (user) {
    insertData.author_id = user.id
    insertData.author_email = user.email
  } else {
    const name = guestName?.trim()
    if (!name) return { error: '请填写昵称' }
    if (name.length > 50) return { error: '昵称不能超过 50 个字符' }

    const h = await headers()
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? h.get('x-real-ip')
      ?? null
    if (!ip || ip === 'unknown') return { error: '无法获取 IP 地址' }

    const { allowed, remaining } = await checkIpRateLimit(ip, 'post_comments', 10, 60)
    if (!allowed) return { error: `评论过于频繁，请 ${remaining > 0 ? `${remaining} 分钟后再试` : '稍后再试'}` }

    insertData.guest_name = name
    insertData.ip = ip
  }

  if (parentId) {
    insertData.parent_id = parentId
  }

  const { data: comment, error } = await supabase.from('post_comments')
    .insert(insertData)
    .select('*')
    .single()

  if (error) return { error: error.message }

  if (user) {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('display_name, avatar_url')
      .eq('user_id', user.id)
      .maybeSingle()

    return {
      data: {
        ...comment,
        parent_id: comment.parent_id ?? null,
        author_email: user.email,
        author: { email: user.email, display_name: settings?.display_name ?? null, avatar_url: settings?.avatar_url ?? null },
        like_count: 0,
        is_liked: false,
        replies: [],
      },
    }
  }

  return {
    data: {
      ...comment,
      parent_id: comment.parent_id ?? null,
      author_email: null,
      author: { email: null, display_name: comment.guest_name ?? '匿名游客', avatar_url: null },
      like_count: 0,
      is_liked: false,
      replies: [],
    },
  }
}

export async function deleteComment(commentId: string, postId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }

  // 允许评论作者或文章作者删除
  const { data: comment } = await supabase
    .from('post_comments')
    .select('author_id')
    .eq('id', commentId)
    .single()

  if (!comment) return { error: '评论不存在' }

  const { data: post } = await supabase
    .from('posts')
    .select('author_id')
    .eq('id', postId)
    .single()

  const isCommentAuthor = comment.author_id === user.id
  const isPostAuthor = post?.author_id === user.id

  if (!isCommentAuthor && !isPostAuthor) {
    return { error: '无权限删除此评论' }
  }

  const { error } = await supabase.from('post_comments')
    .delete()
    .eq('id', commentId)

  if (error) return { error: error.message }
  const slug = await getPostSlug(supabase, postId)
  if (slug) revalidatePath(`/posts/${slug}`)
  return {}
}

export async function toggleCommentLike(commentId: string, clientIp?: string): Promise<ActionResult & { liked?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: existing } = await supabase
      .from('comment_likes')
      .select('id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase
        .from('comment_likes')
        .delete()
        .eq('id', existing.id)
      if (error) return { error: error.message }
      return { liked: false }
    } else {
      const { error } = await supabase
        .from('comment_likes')
        .insert({ comment_id: commentId, user_id: user.id })
      if (error) return { error: error.message }
      return { liked: true }
    }
  }

  // Guest: track by IP
  const ip = clientIp ?? (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? (await headers()).get('x-real-ip')
    ?? null
  if (!ip || ip === 'unknown') return { error: '无法获取IP' }

  const { allowed } = await checkIpRateLimit(ip, 'comment_likes', 10, 60)
  if (!allowed) return { error: '操作过于频繁，请稍后再试' }

  const { data: existing } = await supabase
    .from('comment_likes')
    .select('id')
    .eq('comment_id', commentId)
    .eq('ip', ip)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .eq('id', existing.id)
    if (error) return { error: error.message }
    return { liked: false }
  } else {
    const { error } = await supabase
      .from('comment_likes')
      .insert({ comment_id: commentId, ip })
    if (error) return { error: error.message }
    return { liked: true }
  }
}

export async function getMoreComments(postId: string, page: number): Promise<ActionResult & { data?: any[]; total?: number }> {
  const result = await getCommentsForPost(postId, { page, pageSize: 10 })
  if (result.error) return { error: result.error }
  return { data: result.data, total: result.total }
}
