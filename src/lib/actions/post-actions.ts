'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { getPublishedPosts, getPostsByAuthor, getAllUsers, getPostsByTag } from '@/lib/db/queries'
import { checkIpRateLimit } from '@/lib/utils/rate-limit'
import type { ActionResult } from '@/lib/db/types'

export async function savePost(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }

  const mode = formData.get('_mode') as string
  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const excerpt = formData.get('excerpt') as string | null
  const published = formData.get('published') === 'on'

  // Parse tags from FormData
  let tags: string[] = []
  try {
    const raw = formData.get('tags') as string
    if (raw) tags = JSON.parse(raw) as string[]
  } catch {}

  if (mode === 'update') {
    const postId = formData.get('_id') as string
    const { error } = await supabase.from('posts')
      .update({ title, content, excerpt, published })
      .eq('id', postId)
      .eq('author_id', user.id)
    if (error) return { error: error.message }
    // Update tags
    await savePostTags(postId, tags)
    revalidatePath('/')
    revalidatePath('/profile')
    return {}
  } else {
    // Rate limit: 10 posts per hour per IP
    const h = await headers()
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? h.get('x-real-ip')
      ?? null
    if (ip && ip !== 'unknown') {
      const { allowed } = await checkIpRateLimit(ip, 'posts', 10, 60)
      if (!allowed) return { error: '发布过于频繁，请稍后再试' }
    }

    const id = crypto.randomUUID()
    const slug = id.slice(0, 8)
    const { error } = await supabase.from('posts').insert({
      id,
      author_id: user.id,
      title,
      slug,
      content,
      excerpt,
      published,
    })
    if (error) return { error: error.message }
    // Save tags
    await savePostTags(id, tags)
    revalidatePath('/')
    revalidatePath('/profile')
    return {}
  }
}

/**
 * Upsert tags for a post: create any new tags, then replace all post_tags.
 */
async function savePostTags(postId: string, tagNames: string[]) {
  const supabase = await createClient()

  if (tagNames.length === 0) {
    // Remove all tags from this post
    await supabase.from('post_tags').delete().eq('post_id', postId)
    return
  }

  // Find or create each tag
  const tagIds: string[] = []
  for (const name of tagNames) {
    const trimmed = name.trim()
    if (!trimmed) continue
    const slug = trimmed
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[<>#"{}|\\^`]/g, '')

    // Try to find existing tag
    const { data: existing } = await supabase
      .from('tags')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      tagIds.push(existing.id)
    } else {
      // Create new tag
      const { data: newTag } = await supabase
        .from('tags')
        .insert({ name: trimmed, slug })
        .select('id')
        .single()
      if (newTag) tagIds.push(newTag.id)
    }
  }

  // Replace all post_tags for this post
  if (tagIds.length > 0) {
    await supabase.from('post_tags').delete().eq('post_id', postId)
    await supabase.from('post_tags').insert(
      tagIds.map((tagId) => ({ post_id: postId, tag_id: tagId }))
    )
  }
}

export async function deletePost(postId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }

  const { error } = await supabase.from('posts')
    .delete()
    .eq('id', postId)
    .eq('author_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/')
  revalidatePath('/profile')
  return {}
}

export async function togglePinPost(postId: string): Promise<ActionResult & { pinned?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }

  // 先获取当前状态
  const { data: post } = await supabase
    .from('posts')
    .select('is_pinned')
    .eq('id', postId)
    .eq('author_id', user.id)
    .single()

  if (!post) return { error: '文章不存在' }

  const newPinned = !post.is_pinned
  const { error } = await supabase
    .from('posts')
    .update({ is_pinned: newPinned })
    .eq('id', postId)
    .eq('author_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/')
  revalidatePath('/profile')
  return { pinned: newPinned }
}

export async function loadMorePublishedPosts(page: number) {
  return await getPublishedPosts(page, 10)
}

export async function loadMoreMyPosts(page: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: [], count: 0, error: '未登录' }

  return await getPostsByAuthor(user.id, page, 10)
}

export async function loadMoreAuthors(page: number) {
  return await getAllUsers(page, 20)
}

export async function loadMorePostsByTag(tagSlug: string, page: number) {
  return await getPostsByTag(tagSlug, page, 10)
}
