import { createClient } from '@/lib/supabase/server'

const SUPER_ADMIN_EMAILS = () =>
  (process.env.SUPER_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)

export async function isSuperAdmin(): Promise<boolean> {
  const emails = SUPER_ADMIN_EMAILS()
  if (emails.length === 0) return false

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return false

  return emails.includes(user.email.toLowerCase())
}

export async function getSuperAdminUserIds(): Promise<string[]> {
  const emails = SUPER_ADMIN_EMAILS()
  if (emails.length === 0) return []

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return []

  const { createClient } = await import('@supabase/supabase-js')
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: users, error } = await admin.auth.admin.listUsers()
  if (error || !users?.users) return []

  return users.users
    .filter((u) => u.email && emails.includes(u.email.toLowerCase()))
    .map((u) => u.id)
}
