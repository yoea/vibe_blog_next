'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSuperAdmin } from '@/lib/utils/admin';
import { revalidatePath } from 'next/cache';
import { randomTagColor } from '@/lib/utils/colors';
import { ErrorCode } from '@/lib/db/types';
import type { ActionResult, Tag } from '@/lib/db/types';

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

/**
 * Upsert tags for a post: create any new tags, then replace all post_tags.
 * Returns an error message on failure, or null on success.
 */
export async function savePostTags(
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
