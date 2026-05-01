'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { checkIpRateLimit } from '@/lib/utils/rate-limit';
import { insertNotification } from '@/lib/actions/notification-actions';
import type { ActionResult } from '@/lib/db/types';

function getClientIp(): string {
  return (async () => {
    const h = await headers();
    return (
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      h.get('x-real-ip') ??
      'unknown'
    );
  })() as unknown as string;
}

export async function toggleLike(
  postId: string,
  clientIp?: string,
): Promise<ActionResult & { likes?: number; isLiked?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: post } = await supabase
    .from('posts')
    .select('slug, title, author_id')
    .eq('id', postId)
    .single();

  if (user) {
    // Authenticated: track by user_id
    const { data: existing } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase
        .from('post_likes')
        .insert({ post_id: postId, user_id: user.id });
      if (error) return { error: error.message };

      // 插入通知（跳过自己给自己点赞）
      if (post && post.author_id !== user.id) {
        const { data: settings } = await supabase
          .from('user_settings')
          .select('display_name, avatar_url')
          .eq('user_id', user.id)
          .maybeSingle();
        insertNotification({
          recipientId: post.author_id,
          type: 'post_like',
          actorId: user.id,
          actorName: settings?.display_name ?? user.email ?? '匿名用户',
          actorAvatarUrl: settings?.avatar_url,
          postId,
          postSlug: post.slug,
          postTitle: post.title,
        });
      }
    }
  } else {
    // Unauthenticated: track by IP
    const ip = clientIp ?? (await getClientIp());
    if (ip === 'unknown') return { error: '无法获取IP' };

    const { allowed } = await checkIpRateLimit(ip, 'post_likes', 10, 60);
    if (!allowed) return { error: '操作过于频繁，请稍后再试' };

    const { data: existing } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('ip', ip)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('ip', ip);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase
        .from('post_likes')
        .insert({ post_id: postId, ip });
      if (error) return { error: error.message };

      // 匿名点赞也插入通知
      if (post) {
        insertNotification({
          recipientId: post.author_id,
          type: 'post_like',
          actorName: '匿名用户',
          postId,
          postSlug: post.slug,
          postTitle: post.title,
        });
      }
    }
  }

  // Fetch updated like count
  const { count } = await supabase
    .from('post_likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);

  // Fetch updated liked status
  let isLiked = false;
  if (user) {
    const { data } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();
    isLiked = !!data;
  } else if (clientIp) {
    const { data } = await supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('ip', clientIp)
      .maybeSingle();
    isLiked = !!data;
  }

  if (post) revalidatePath(`/posts/${post.slug}`);
  return { likes: count ?? 0, isLiked };
}
