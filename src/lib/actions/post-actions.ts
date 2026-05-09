'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import {
  getPublishedPosts,
  getPostsByAuthor,
  getAllUsers,
  getPostsByTag,
} from '@/lib/db/queries';
import { isSuperAdmin } from '@/lib/utils/admin';
import { checkIpRateLimit } from '@/lib/utils/rate-limit';
import { ErrorCode } from '@/lib/db/types';
import type { ActionResult, Tag } from '@/lib/db/types';

export async function savePost(formData: FormData): Promise<ActionResult> {
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
    const slug = formData.get('_slug') as string | null;
    if (slug) revalidatePath(`/posts-edit/${slug}`);
    revalidatePath('/');
    revalidatePath('/profile');
    return {};
  } else {
    // Rate limit: 10 posts per hour per IP
    const h = await headers();
    const ip =
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      h.get('x-real-ip') ??
      null;
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
    return {};
  }
}

/**
 * Return a random hex color from a curated palette that works in both themes.
 */
function randomTagColor(): string {
  const palette = [
    '#3B82F6',
    '#22C55E',
    '#A855F7',
    '#EC4899',
    '#F97316',
    '#14B8A6',
    '#EF4444',
    '#6366F1',
    '#EAB308',
    '#06B6D4',
    '#84CC16',
    '#F43F5E',
    '#8B5CF6',
    '#0EA5E9',
  ];
  return palette[Math.floor(Math.random() * palette.length)];
}

/**
 * Upsert tags for a post: create any new tags, then replace all post_tags.
 * Returns an error message on failure, or null on success.
 */
async function savePostTags(
  supabase: Awaited<ReturnType<typeof createClient>>,
  postId: string,
  tagNames: string[],
  userId?: string,
): Promise<string | null> {
  if (tagNames.length === 0) {
    // Remove all tags from this post
    const { error } = await supabase
      .from('post_tags')
      .delete()
      .eq('post_id', postId);
    if (error) return `清除标签失败: ${error.message}`;
    return null;
  }

  // Find or create each tag
  const tagIds: string[] = [];
  for (const name of tagNames) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const slug = trimmed
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[<>#"{}|\\^`]/g, '');

    // Try to find existing tag
    const { data: existing } = await supabase
      .from('tags')
      .select('id, color')
      .eq('slug', slug)
      .maybeSingle();

    if (existing) {
      tagIds.push(existing.id);
    } else {
      // Create new tag with a random color
      const insertData: any = { name: trimmed, slug, color: randomTagColor() };
      if (userId) insertData.created_by = userId;
      const { data: newTag, error: createError } = await supabase
        .from('tags')
        .insert(insertData)
        .select('id')
        .single();
      if (createError)
        return `创建标签「${trimmed}」失败: ${createError.message}`;
      if (newTag) tagIds.push(newTag.id);
    }
  }

  // Replace all post_tags for this post
  if (tagIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('post_tags')
      .delete()
      .eq('post_id', postId);
    if (deleteError) return `清除旧标签失败: ${deleteError.message}`;

    const { error: insertError } = await supabase
      .from('post_tags')
      .insert(tagIds.map((tagId) => ({ post_id: postId, tag_id: tagId })));
    if (insertError) return `保存标签失败: ${insertError.message}`;
  }

  return null;
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

export async function createTag(
  name: string,
): Promise<ActionResult & { tag?: Tag }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '请先登录', error_code: ErrorCode.UNAUTHORIZED };

  const trimmed = name.trim();
  if (!trimmed)
    return { error: '标签名不能为空', error_code: ErrorCode.VALIDATION };
  if (trimmed.length > 50)
    return {
      error: '标签名不能超过50个字符',
      error_code: ErrorCode.VALIDATION,
    };

  const slug = trimmed
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[<>#"{}|\\^`]/g, '');

  // Check if slug already exists
  const { data: existing } = await supabase
    .from('tags')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (existing)
    return {
      error: `标签「${trimmed}」已存在`,
      error_code: ErrorCode.CONFLICT,
    };

  const { data: newTag, error } = await supabase
    .from('tags')
    .insert({
      name: trimmed,
      slug,
      color: randomTagColor(),
      created_by: user.id,
    })
    .select()
    .single();

  if (error)
    return {
      error: `创建标签失败: ${error.message}`,
      error_code: ErrorCode.SERVER_ERROR,
    };
  revalidatePath('/tags');
  return { tag: newTag as Tag };
}

export async function deleteTag(tagId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '请先登录', error_code: ErrorCode.UNAUTHORIZED };

  // Verify ownership (admin can delete any tag)
  const { data: tag } = await supabase
    .from('tags')
    .select('created_by')
    .eq('id', tagId)
    .single();

  if (!tag) return { error: '标签不存在', error_code: ErrorCode.NOT_FOUND };
  const isAdmin = await isSuperAdmin();
  if (tag.created_by !== user.id && !isAdmin)
    return { error: '只能删除自己创建的标签', error_code: ErrorCode.FORBIDDEN };

  // Use admin client to bypass RLS and delete all post_tags + tag
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      error: '管理员客户端初始化失败，请检查 SUPABASE_SERVICE_ROLE_KEY 配置',
      error_code: ErrorCode.SERVER_ERROR,
    };
  }
  const { error: ptError } = await admin
    .from('post_tags')
    .delete()
    .eq('tag_id', tagId);
  if (ptError)
    return {
      error: `删除文章标签关联失败: ${ptError.message}`,
      error_code: ErrorCode.SERVER_ERROR,
    };

  const { error: tagError } = await admin.from('tags').delete().eq('id', tagId);
  if (tagError)
    return {
      error: `删除标签失败: ${tagError.message}`,
      error_code: ErrorCode.SERVER_ERROR,
    };

  revalidatePath('/tags');
  revalidatePath('/profile');
  revalidatePath('/');
  return {};
}
