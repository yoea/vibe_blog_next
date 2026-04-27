'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/db/types'

export async function resetPasswordForEmail(): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: '无法获取用户邮箱' }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${siteUrl}/api/auth/callback?type=recovery`,
  })
  if (error) return { error: error.message }
  return {}
}

export async function deleteAccount(): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '未登录' }

  // Check if service role key is available
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return { error: '服务器未配置注销功能' }

  const { createClient: createAdminClient } = await import('@supabase/supabase-js')
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Keep posts and comments - mark user as deleted instead of removing
  await admin.from('user_settings').upsert({
    user_id: user.id,
    display_name: `用户${user.id.slice(0, 4)}已注销`,
    is_deleted: true,
    deleted_at: new Date().toISOString(),
  })
  await admin.from('post_comments').update({ author_email: null }).eq('author_id', user.id)

  // Update auth user: scramble email + password so login is impossible,
  // but keep the auth record so FK constraints on posts/comments remain valid
  await admin.auth.admin.updateUserById(user.id, {
    email: `deleted-${user.id.slice(0, 8)}@deleted.local`,
    password: crypto.randomUUID(),
  })

  // Sign out the current session
  await supabase.auth.signOut()

  revalidatePath('/', 'layout')
  return {}
}
