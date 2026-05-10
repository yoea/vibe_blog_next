import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, authErrorResponse } from '@/lib/api/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  const authError = authErrorResponse(auth);
  if (authError) return authError;

  const supabase = await createAdminClient();

  const { data: authUser } = await supabase.auth.admin.getUserById((auth as { userId: string; keyId: string }).userId);

  const { data: settings } = await supabase
    .from('user_settings')
    .select('display_name, avatar_url, is_admin')
    .eq('user_id', (auth as { userId: string; keyId: string }).userId)
    .maybeSingle();

  return NextResponse.json({
    data: {
      userId: (auth as { userId: string; keyId: string }).userId,
      email: authUser?.user?.email ?? null,
      displayName:
        settings?.display_name ?? authUser?.user?.email?.split('@')[0] ?? null,
      avatarUrl: settings?.avatar_url ?? null,
      isAdmin: settings?.is_admin ?? false,
    },
  });
}
