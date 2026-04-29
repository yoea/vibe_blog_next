import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsForm } from '@/components/settings/settings-form'
import { isSuperAdmin } from '@/lib/utils/admin'

export const metadata = {
  title: '设置',
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/settings')

  const isAdmin = await isSuperAdmin()

  let maintenanceMode = false
  if (isAdmin) {
    const { data } = await supabase
      .from('site_config')
      .select('maintenance_mode')
      .eq('id', 1)
      .maybeSingle()
    maintenanceMode = data?.maintenance_mode ?? false
  }

  // 查询 GitHub 绑定状态
  const isGitHubConnected = user.identities?.some(i => i.provider === 'github') ?? false
  const githubIdentity = user.identities?.find(i => i.provider === 'github') ?? null

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">设置</h1>
      <SettingsForm
        user={user}
        isAdmin={isAdmin}
        maintenanceMode={maintenanceMode}
        isGitHubConnected={isGitHubConnected}
        githubIdentity={githubIdentity}
      />
    </div>
  )
}
