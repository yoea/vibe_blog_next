'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getPostSlug(supabase: any, postId: string): Promise<string | null> {
  const { data } = await supabase.from('posts').select('slug').eq('id', postId).single()
  return data?.slug ?? null
}

export async function createComment(postId: string, content: string, parentId?: string): Promise<{ error?: string; data?: any }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }
  if (!content.trim()) return { error: '评论内容不能为空' }

  const insertData: any = {
    post_id: postId,
    author_id: user.id,
    author_email: user.email,
    content: content.trim(),
  }
  if (parentId) {
    insertData.parent_id = parentId
  }

  const { data: comment, error } = await supabase.from('post_comments')
    .insert(insertData)
    .select('*')
    .single()

  if (error) return { error: error.message }

  const { data: settings } = await supabase
    .from('user_settings')
    .select('display_name')
    .eq('user_id', user.id)
    .maybeSingle()

  return {
    data: {
      ...comment,
      parent_id: comment.parent_id ?? null,
      author_email: user.email,
      author: { email: user.email, display_name: settings?.display_name ?? null },
      like_count: 0,
      is_liked: false,
      replies: [],
    },
  }
}

export async function deleteComment(commentId: string, postId: string): Promise<{ error?: string }> {
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

export async function toggleCommentLike(commentId: string): Promise<{ liked?: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '请先登录' }

  // Check if already liked
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
