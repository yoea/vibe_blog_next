'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { isSuperAdmin } from '@/lib/utils/admin';
import { revalidatePath } from 'next/cache';
import { ErrorCode } from '@/lib/db/types';
import type { ActionResult } from '@/lib/db/types';

export async function deleteUserAsAdmin(
  targetUserId: string,
): Promise<ActionResult> {
  if (!(await isSuperAdmin()))
    return { error: '无权限', error_code: ErrorCode.FORBIDDEN };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: '服务器未配置', error_code: ErrorCode.SERVER_ERROR };
  }

  // Mark user_settings as deleted
  await admin
    .from('user_settings')
    .update({
      display_name: `用户${targetUserId.slice(0, 4)}已注销`,
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    })
    .eq('user_id', targetUserId);

  // Clear comment email references
  await admin
    .from('post_comments')
    .update({ author_email: null })
    .eq('author_id', targetUserId);

  // Scramble auth credentials so login is impossible
  await admin.auth.admin.updateUserById(targetUserId, {
    email: `deleted-${targetUserId.slice(0, 8)}@deleted.local`,
    password: crypto.randomUUID(),
  });

  revalidatePath('/author');
  return {};
}
