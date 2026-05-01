'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSuperAdmin } from '@/lib/utils/admin'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/db/types'

export async function archivePost(postId: string): Promise<ActionResult> {
  if (!await isSuperAdmin()) return { error: '无权限' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }

  const admin = createAdminClient()

  // 读取原文章
  const { data: post, error: fetchError } = await admin
    .from('posts')
    .select('*')
    .eq('id', postId)
    .single()

  if (fetchError || !post) return { error: '文章不存在' }

  // 写入归档表
  const { error: insertError } = await admin
    .from('articles_archive')
    .insert({
      original_id: post.id,
      author_id: post.author_id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      published: post.published,
      is_pinned: post.is_pinned,
      created_at: post.created_at,
      updated_at: post.updated_at,
      archived_at: new Date().toISOString(),
      archived_by: user.id,
    })

  if (insertError) return { error: `归档失败: ${insertError.message}` }

  // 删除原文章（CASCADE 自动清理关联数据）
  const { error: deleteError } = await admin
    .from('posts')
    .delete()
    .eq('id', postId)

  if (deleteError) return { error: `删除原文章失败: ${deleteError.message}` }

  revalidatePath('/')
  revalidatePath('/admin/archive')
  return {}
}

export async function restorePost(archiveId: string): Promise<ActionResult> {
  if (!await isSuperAdmin()) return { error: '无权限' }

  const admin = createAdminClient()

  // 读取归档文章
  const { data: archived, error: fetchError } = await admin
    .from('articles_archive')
    .select('*')
    .eq('id', archiveId)
    .single()

  if (fetchError || !archived) return { error: '归档文章不存在' }

  // 检查 slug 冲突
  let slug = archived.slug
  const { data: existing } = await admin
    .from('posts')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    slug = `${slug}-restored-${Date.now().toString(36).slice(-4)}`
  }

  // 还原到 posts 表
  const { error: insertError } = await admin
    .from('posts')
    .insert({
      id: archived.original_id,
      author_id: archived.author_id,
      title: archived.title,
      slug,
      content: archived.content,
      excerpt: archived.excerpt,
      published: archived.published,
      is_pinned: archived.is_pinned,
      created_at: archived.created_at,
      updated_at: archived.updated_at,
    })

  if (insertError) return { error: `还原失败: ${insertError.message}` }

  // 删除归档记录
  await admin.from('articles_archive').delete().eq('id', archiveId)

  revalidatePath('/')
  revalidatePath('/admin/archive')
  return {}
}

export async function permanentlyDeleteArchive(archiveId: string): Promise<ActionResult> {
  if (!await isSuperAdmin()) return { error: '无权限' }

  const admin = createAdminClient()

  const { error } = await admin
    .from('articles_archive')
    .delete()
    .eq('id', archiveId)

  if (error) return { error: `删除失败: ${error.message}` }

  revalidatePath('/admin/archive')
  return {}
}
