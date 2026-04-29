import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

export async function isSuperAdmin(user?: User | null): Promise<boolean> {
  if (!user) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  }

  if (!user) return false

  const supabase = await createClient()
  const { data } = await supabase
    .from('user_settings')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle()

  return data?.is_admin ?? false
}

export async function getSuperAdminUserIds(): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_settings')
    .select('user_id')
    .eq('is_admin', true)

  return data?.map((r) => r.user_id) ?? []
}
