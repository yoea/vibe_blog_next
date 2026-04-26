import { getUserSettings } from '@/lib/db/queries'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsForm } from '@/components/settings/settings-form'

export const metadata = {
  title: '设置',
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/settings')

  const { data: settings } = await getUserSettings(user.id)
  const displayName = settings?.display_name ?? user.email?.split('@')[0] ?? ''
  const avatarUrl = settings?.avatar_url ?? null

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">设置</h1>
      <SettingsForm
        user={user}
        displayName={displayName}
        avatarUrl={avatarUrl}
      />
    </div>
  )
}
