'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ErrorCode } from '@/lib/db/types';
import type { ActionResult } from '@/lib/db/types';

export async function updateUserSettings(
  displayName: string,
  motd?: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登录', error_code: ErrorCode.UNAUTHORIZED };

  const updateData: Record<string, unknown> = {
    user_id: user.id,
    display_name: displayName || null,
  };
  if (motd !== undefined) {
    updateData.motd = motd || null;
  }

  const { error } = await supabase
    .from('user_settings')
    .upsert(updateData, { onConflict: 'user_id' });

  if (error)
    return { error: error.message, error_code: ErrorCode.SERVER_ERROR };
  revalidatePath('/settings');
  revalidatePath(`/author/${user.id}`);
  return {};
}
