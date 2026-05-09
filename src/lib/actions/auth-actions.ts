'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { ErrorCode } from '@/lib/db/types';
import type { ActionResult } from '@/lib/db/types';

export async function deleteAccount(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登录', error_code: ErrorCode.UNAUTHORIZED };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error: '服务器未配置注销功能',
      error_code: ErrorCode.SERVER_ERROR,
    };
  }

  // Keep posts and comments - mark user as deleted instead of removing
  await admin.from('user_settings').upsert({
    user_id: user.id,
    display_name: `用户${user.id.slice(0, 4)}已注销`,
    is_deleted: true,
    deleted_at: new Date().toISOString(),
  });
  await admin
    .from('post_comments')
    .update({ author_email: null })
    .eq('author_id', user.id);

  // Update auth user: scramble email + password so login is impossible,
  // but keep the auth record so FK constraints on posts/comments remain valid
  await admin.auth.admin.updateUserById(user.id, {
    email: `deleted-${user.id.slice(0, 8)}@deleted.local`,
    password: crypto.randomUUID(),
  });

  // 先刷新缓存（确保作者列表等页面更新），再尝试退出登录
  revalidatePath('/', 'layout');
  revalidatePath('/author');

  // 清除本地 session（不阻塞，signOut 可能因初始化/锁卡住）
  supabase.auth.signOut().catch(() => {});
  return {};
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function onAuthChange(): Promise<void> {
  revalidatePath('/', 'layout');
  revalidatePath('/author');
}
