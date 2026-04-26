'use server'

import { createClient } from '@/lib/supabase/server'
import { getGuestbookMessages } from '@/lib/db/queries'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/db/types'

export async function createGuestbookMessage(toAuthorId: string, content: string, parentId?: string): Promise<ActionResult & { data?: any }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '请先登录' }
  if (!content.trim()) return { error: '内容不能为空' }
  if (content.trim().length > 500) return { error: '内容不能超过 500 个字符' }

  const insertData: any = {
    to_author_id: toAuthorId,
    author_id: user.id,
    author_email: user.email,
    content: content.trim(),
  }
  if (parentId) insertData.parent_id = parentId

  const { data: message, error } = await supabase
    .from('guestbook_messages')
    .insert(insertData)
    .select('*')
    .single()

  if (error) return { error: error.message }

  const { data: settings } = await supabase
    .from('user_settings')
    .select('display_name, avatar_url')
    .eq('user_id', user.id)
    .maybeSingle()

  revalidatePath(`/author/${toAuthorId}`)

  return {
    data: {
      ...message,
      parent_id: message.parent_id ?? null,
      author_email: user.email,
      author: { display_name: settings?.display_name ?? null, avatar_url: settings?.avatar_url ?? null },
      replies: [],
    },
  }
}

export async function deleteGuestbookMessage(messageId: string, toAuthorId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '请先登录' }

  const { data: message } = await supabase
    .from('guestbook_messages')
    .select('author_id')
    .eq('id', messageId)
    .single()

  if (!message) return { error: '留言不存在' }
  if (message.author_id !== user.id) return { error: '无权限删除' }

  const { error } = await supabase
    .from('guestbook_messages')
    .delete()
    .eq('id', messageId)

  if (error) return { error: error.message }
  revalidatePath(`/author/${toAuthorId}`)
  return {}
}

export async function getMoreGuestbookMessages(toAuthorId: string, page: number): Promise<ActionResult & { data?: any[]; total?: number }> {
  const result = await getGuestbookMessages(toAuthorId, { page, pageSize: 10 })
  if (result.error) return { error: result.error }
  return { data: result.data, total: result.total }
}
