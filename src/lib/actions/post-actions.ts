'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getClientIp } from '@/lib/utils/get-client-ip';
import {
  getPublishedPosts,
  getPostsByAuthor,
  getAllUsers,
  getPostsByTag,
} from '@/lib/db/queries';
import { checkIpRateLimit } from '@/lib/utils/rate-limit';
import { ErrorCode } from '@/lib/db/types';
import type { ActionResult } from '@/lib/db/types';
import { savePostTags } from '@/lib/actions/tag-actions';

export async function savePost(
  formData: FormData,
): Promise<ActionResult<{ slug?: string }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登录', error_code: ErrorCode.UNAUTHORIZED };

  const mode = formData.get('_mode') as string;
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  const excerpt = (formData.get('excerpt') as string | null) || null;
  const coverImageUrl =
    (formData.get('cover_image_url') as string | null) || null;
  const published = formData.get('published') === 'on';

  // Parse tags from FormData
  let tags: string[] = [];
  try {
    const raw = formData.get('tags') as string;
    if (raw)
      tags = JSON.parse(raw).filter(
        (t: unknown): t is string => typeof t === 'string',
      );
  } catch {}

  if (mode === 'update') {
    const postId = formData.get('_id') as string;
    const { error } = await supabase
      .from('posts')
      .update({
        title,
        content,
        excerpt,
        cover_image_url: coverImageUrl,
        published,
      })
      .eq('id', postId)
      .eq('author_id', user.id);
    if (error)
      return { error: error.message, error_code: ErrorCode.SERVER_ERROR };
    // Update tags
    const tagError = await savePostTags(supabase, postId, tags, user.id);
    if (tagError)
      return { error: tagError, error_code: ErrorCode.SERVER_ERROR };
    // Revalidate all relevant paths
    const slug = (formData.get('_slug') as string) || '';
    if (slug) revalidatePath(`/posts-edit/${slug}`);
    revalidatePath('/');
    revalidatePath('/profile');
    revalidatePath('/tags');
    return { slug };
  } else {
    // Rate limit: 10 posts per hour per IP
    const ip = await getClientIp();
    if (ip && ip !== 'unknown') {
      const { allowed } = await checkIpRateLimit(ip, 'posts', 10, 60);
      if (!allowed)
        return {
          error: '发布过于频繁，请稍后再试',
          error_code: ErrorCode.RATE_LIMITED,
        };
    }

    // 幂等去重：30 秒内相同标题和内容的文章视为重复（防止双击）
    const { data: duplicate } = await supabase
      .from('posts')
      .select('id')
      .eq('author_id', user.id)
      .eq('title', title)
      .gte('created_at', new Date(Date.now() - 30000).toISOString())
      .maybeSingle();
    if (duplicate) return {};

    const id = crypto.randomUUID();
    const slugId = id.slice(0, 8);
    const { error } = await supabase.from('posts').insert({
      id,
      author_id: user.id,
      title,
      slug: slugId,
      content,
      excerpt,
      cover_image_url: coverImageUrl,
      published,
    });
    if (error)
      return { error: error.message, error_code: ErrorCode.SERVER_ERROR };
    // Save tags
    const tagError = await savePostTags(supabase, id, tags, user.id);
    if (tagError)
      return { error: tagError, error_code: ErrorCode.SERVER_ERROR };
    revalidatePath('/');
    revalidatePath('/profile');
    revalidatePath('/tags');
    return { slug: slugId };
  }
}

export async function deletePost(postId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登录', error_code: ErrorCode.UNAUTHORIZED };

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('author_id', user.id);

  if (error)
    return { error: error.message, error_code: ErrorCode.SERVER_ERROR };
  revalidatePath('/');
  revalidatePath('/profile');
  return {};
}

export async function togglePinPost(
  postId: string,
): Promise<ActionResult & { pinned?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登录', error_code: ErrorCode.UNAUTHORIZED };

  // 先获取当前状态
  const { data: post } = await supabase
    .from('posts')
    .select('is_pinned')
    .eq('id', postId)
    .eq('author_id', user.id)
    .single();

  if (!post) return { error: '文章不存在', error_code: ErrorCode.NOT_FOUND };

  const newPinned = !post.is_pinned;
  const { error } = await supabase
    .from('posts')
    .update({ is_pinned: newPinned })
    .eq('id', postId)
    .eq('author_id', user.id);

  if (error)
    return { error: error.message, error_code: ErrorCode.SERVER_ERROR };
  revalidatePath('/');
  revalidatePath('/profile');
  return { pinned: newPinned };
}

export async function loadMorePublishedPosts(page: number) {
  return await getPublishedPosts(page, 5);
}

export async function loadMoreMyPosts(page: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      data: [],
      count: 0,
      error: '未登录',
      error_code: ErrorCode.UNAUTHORIZED,
    };

  return await getPostsByAuthor(user.id, page, 10);
}

export async function loadMoreAuthors(page: number) {
  return await getAllUsers(page, 20);
}

export async function loadMorePostsByTag(tagSlug: string, page: number) {
  return await getPostsByTag(tagSlug, page, 10);
}
