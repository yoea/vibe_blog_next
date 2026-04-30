'use server'

import { createClient } from '@/lib/supabase/server'
import { getGuestbookMessages } from '@/lib/db/queries'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { checkIpRateLimit } from '@/lib/utils/rate-limit'
import { insertNotification } from '@/lib/actions/notification-actions'
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

  if (parentId) {
    // Resolve to top-level parent for flat 1-level nesting
    const { data: parent } = await supabase
      .from('guestbook_messages')
      .select('id, parent_id')
      .eq('id', parentId)
      .single()
    if (parent) {
      insertData.parent_id = parent.parent_id ?? parent.id
    } else {
      insertData.parent_id = parentId
    }
  }

  const { data: message, error } = await supabase
    .from('guestbook_messages')
    .insert(insertData)
    .select('*')
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/author/${toAuthorId}`)

  // 插入通知（跳过自己给自己留言）
  if (!user || toAuthorId !== user.id) {
    let actorName: string | null = guestName ?? '匿名游客'
    let actorAvatarUrl: string | null = null
    if (user) {
      const { data: settings } = await supabase
        .from('user_settings')
        .select('display_name, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle()
      actorName = settings?.display_name ?? user.email ?? '匿名用户'
      actorAvatarUrl = settings?.avatar_url ?? null
    }
    insertNotification({
      recipientId: toAuthorId,
      type: 'guestbook_message',
      actorId: user?.id ?? null,
      actorName,
      actorAvatarUrl,
      guestbookAuthorId: toAuthorId,
      guestbookMessageId: message.id,
      guestbookMessageContent: content.trim(),
    })
  }

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

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return { error: '服务器配置错误' }

  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 先验证留言存在且当前用户有权限删除
  const { data: message } = await admin
    .from('guestbook_messages')
    .select('id, author_id, to_author_id')
    .eq('id', messageId)
    .single()

  if (!message) return { error: '留言不存在' }
  if (message.author_id !== user.id && message.to_author_id !== user.id) return { error: '无权限删除' }

  // ON DELETE CASCADE 自动删除子回复
  const { error } = await admin
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
