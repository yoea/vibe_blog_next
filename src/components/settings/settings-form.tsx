'use client';

import type { User } from '@supabase/supabase-js';
import { ThemeSection } from './theme-section';
import { AccountSecuritySection } from './account-security-section';
import { AccountActionsSection } from './account-actions-section';
import { SupportSection } from './support-section';
import { AdminSections } from './admin-sections';
import { ApiKeyManager } from './api-key-manager';

interface Props {
  user: User;
  isAdmin?: boolean;
  maintenanceMode?: boolean;
  aiBaseUrl?: string;
  aiApiKey?: string;
  aiModel?: string;
  aiModels?: string[];
  icpNumber?: string;
  icpVisible?: boolean;
  showDeployNotify?: boolean;
}

export function SettingsForm({
  user,
  isAdmin,
  maintenanceMode,
  aiBaseUrl = '',
  aiApiKey = '',
  aiModel = '',
  aiModels = [],
  icpNumber = '',
  icpVisible = false,
  showDeployNotify = false,
}: Props) {
  const isPasswordUser =
    user.app_metadata?.provider === 'email' ||
    (user.identities?.some((i) => i.provider === 'email') ?? false);

  return (
    <div className="space-y-6">
      <ThemeSection />
      {isPasswordUser && <AccountSecuritySection user={user} />}
      <AccountActionsSection user={user} />
      <SupportSection />
      {isAdmin && (
        <AdminSections
          maintenanceMode={maintenanceMode ?? false}
          aiBaseUrl={aiBaseUrl}
          aiApiKey={aiApiKey}
          aiModel={aiModel}
          aiModels={aiModels}
          icpNumber={icpNumber}
          icpVisible={icpVisible}
          showDeployNotify={showDeployNotify}
          apiKeySection={<ApiKeyManager />}
        />
      )}
    </div>
  );
}
