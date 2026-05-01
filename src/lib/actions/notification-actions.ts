'use server';

import { createClient } from '@/lib/supabase/server';
import { getNotificationsForUser } from '@/lib/db/queries';
import type {
  ActionResult,
  Notification,
  NotificationType,
} from '@/lib/db/types';

interface InsertNotificationParams {
  recipientId: string;
  type: NotificationType;
  actorId?: string | null;
  actorName?: string | null;
  actorAvatarUrl?: string | null;
  postId?: string | null;
  postSlug?: string | null;
  postTitle?: string | null;
  commentId?: string | null;
  guestbookAuthorId?: string | null;
  guestbookMessageId?: string | null;
  guestbookMessageContent?: string | null;
}

export async function insertNotification(
  params: InsertNotificationParams,
): Promise<void> {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return;

    const { createClient: createAdminClient } =
      await import('@supabase/supabase-js');
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    await admin.from('notifications').insert({
      recipient_id: params.recipientId,
      type: params.type,
      actor_id: params.actorId ?? null,
      actor_name: params.actorName ?? null,
      actor_avatar_url: params.actorAvatarUrl ?? null,
      post_id: params.postId ?? null,
      post_slug: params.postSlug ?? null,
      post_title: params.postTitle ?? null,
      comment_id: params.commentId ?? null,
      guestbook_author_id: params.guestbookAuthorId ?? null,
      guestbook_message_id: params.guestbookMessageId ?? null,
      guestbook_message_content: params.guestbookMessageContent ?? null,
    });
  } catch {
    // 通知插入失败不影响主流程，静默忽略
  }
}

export async function getNotifications(
  page: number,
): Promise<ActionResult & { data?: Notification[]; total?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '请先登录' };

  const result = await getNotificationsForUser(user.id, { page, pageSize: 5 });
  if (result.error) return { error: result.error };
  return { data: result.data, total: result.total };
}

export async function markAsRead(ids: string[]): Promise<ActionResult> {
  if (ids.length === 0) return {};

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '请先登录' };

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', user.id)
    .in('id', ids)
    .eq('is_read', false);

  if (error) return { error: error.message };
  return {};
}

export async function dismissNotification(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '请先登录' };

  const { error } = await supabase
    .from('notifications')
    .update({ is_dismissed: true })
    .eq('id', id)
    .eq('recipient_id', user.id);

  if (error) return { error: error.message };
  return {};
}

export async function markAllAsRead(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '请先登录' };

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', user.id)
    .eq('is_read', false)
    .eq('is_dismissed', false);

  if (error) return { error: error.message };
  return {};
}

export async function dismissAllNotifications(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '请先登录' };

  const { error } = await supabase
    .from('notifications')
    .update({ is_dismissed: true })
    .eq('recipient_id', user.id)
    .eq('is_dismissed', false);

  if (error) return { error: error.message };
  return {};
}

export async function getUnreadCount(): Promise<
  ActionResult & { count?: number }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '请先登录' };

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', user.id)
    .eq('is_read', false)
    .eq('is_dismissed', false);

  if (error) return { error: error.message };
  return { count: count ?? 0 };
}
