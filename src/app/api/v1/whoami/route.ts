import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { ErrorCode } from '@/lib/db/types';

export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request);
  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthorized', error_code: ErrorCode.UNAUTHORIZED },
      { status: 401 },
    );
  }

  const supabase = await createAdminClient();

  const { data: authUser } = await supabase.auth.admin.getUserById(auth.userId);

  const { data: settings } = await supabase
    .from('user_settings')
    .select('display_name, avatar_url, is_admin')
    .eq('user_id', auth.userId)
    .maybeSingle();

  return NextResponse.json({
    data: {
      userId: auth.userId,
      email: authUser?.user?.email ?? null,
      displayName:
        settings?.display_name ?? authUser?.user?.email?.split('@')[0] ?? null,
      avatarUrl: settings?.avatar_url ?? null,
      isAdmin: settings?.is_admin ?? false,
    },
  });
}
