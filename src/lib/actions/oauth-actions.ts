'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/db/types'

/**
 * 获取当前用户的 OAuth identities（第三方登录绑定状态）
 */
export async function getOAuthIdentities() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) return { error: '未登录', identities: [] as { provider: string; id: string; created_at: string | undefined }[] }

  const identities = (user.identities ?? []).map((identity) => ({
    provider: identity.provider,
    id: identity.id,
    created_at: identity.created_at,
  }))

  return { identities }
}

/**
 * 解绑 GitHub 账号（清除 user_settings 中的 github_id）
 */
export async function unlinkGitHubIdentity(): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: '未登录' }

  // 清除 user_settings 中的 github_id
  const { error } = await supabase
    .from('user_settings')
    .update({ github_id: null })
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/profile')
  revalidatePath('/settings')
  return {}
}
