import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SettingsForm } from '@/components/settings/settings-form';
import { isSuperAdmin } from '@/lib/utils/admin';

export const metadata = {
  title: '设置',
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/settings');

  const isAdmin = await isSuperAdmin();

  let maintenanceMode = false;
  let aiBaseUrl = '';
  let aiApiKey = '';
  let aiModel = '';
  let icpNumber = '';
  let icpVisible = false;
  let showDeployNotify = false;
  if (isAdmin) {
    const { data } = await supabase
      .from('site_config')
      .select('key, value')
      .in('key', [
        'maintenance_mode',
        'ai_base_url',
        'ai_api_key',
        'ai_model',
        'icp_number',
        'icp_visible',
        'show_deploy_notify',
      ]);

    const config = Object.fromEntries(
      (data ?? []).map((r) => [r.key, r.value]),
    );
    maintenanceMode = config.maintenance_mode === 'true';
    aiBaseUrl = config.ai_base_url ?? '';
    aiApiKey = config.ai_api_key ?? '';
    aiModel = config.ai_model ?? '';
    icpNumber = config.icp_number ?? '';
    icpVisible = config.icp_visible === 'true';
    showDeployNotify = config.show_deploy_notify === 'true';
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">设置</h1>
      <SettingsForm
        user={user}
        isAdmin={isAdmin}
        maintenanceMode={maintenanceMode}
        aiBaseUrl={aiBaseUrl}
        aiApiKey={aiApiKey}
        aiModel={aiModel}
        icpNumber={icpNumber}
        icpVisible={icpVisible}
        showDeployNotify={showDeployNotify}
      />
    </div>
  );
}
