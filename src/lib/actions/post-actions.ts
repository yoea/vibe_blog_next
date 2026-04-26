'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getPublishedPosts, getPostsByAuthor, getAllUsers } from '@/lib/db/queries'
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

  if (mode === 'update') {
    const postId = formData.get('_id') as string
    const { error } = await supabase.from('posts')
      .update({ title, content, excerpt, published })
      .eq('id', postId)
      .eq('author_id', user.id)
    if (error) return { error: error.message }
    revalidatePath('/')
    revalidatePath('/my-posts')
    return {}
  } else {
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
    revalidatePath('/')
    revalidatePath('/my-posts')
    return {}
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
  revalidatePath('/my-posts')
  return {}
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
