'use server'

import { createClient } from '@/lib/supabase/server'
import { getGuestbookMessages } from '@/lib/db/queries'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { checkIpRateLimit } from '@/lib/utils/rate-limit'
import type { ActionResult } from '@/lib/db/types'

export async function createGuestbookMessage(
  toAuthorId: string,
  content: string,
  parentId?: string,
  guestName?: string
): Promise<ActionResult & { data?: any }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!content.trim()) return { error: '内容不能为空' }
  if (content.trim().length > 500) return { error: '内容不能超过 500 个字符' }

  const insertData: any = {
    to_author_id: toAuthorId,
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

    const { allowed, remaining } = await checkIpRateLimit(ip, 'guestbook_messages', 10, 60)
    if (!allowed) return { error: `留言过于频繁，请 ${remaining > 0 ? `${remaining} 分钟后再试` : '稍后再试'}` }

    insertData.guest_name = name
    insertData.ip = ip
  }

  if (parentId) insertData.parent_id = parentId

  const { data: message, error } = await supabase
    .from('guestbook_messages')
    .insert(insertData)
    .select('*')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/author/${toAuthorId}`)

  if (user) {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('display_name, avatar_url')
      .eq('user_id', user.id)
      .maybeSingle()

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

  return {
    data: {
      ...message,
      parent_id: message.parent_id ?? null,
      author_email: null,
      author: { display_name: message.guest_name ?? '匿名游客', avatar_url: null },
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
    .select('author_id, to_author_id')
    .eq('id', messageId)
    .single()

  if (!message) return { error: '留言不存在' }
  if (message.author_id !== user.id && message.to_author_id !== user.id) return { error: '无权限删除' }

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
