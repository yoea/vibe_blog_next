'use server';

import { createClient } from '@/lib/supabase/server';
import { ErrorCode } from '@/lib/db/types';
import type { ActionResult } from '@/lib/db/types';

export async function autoSaveDraft(data: {
  postId?: string;
  title: string;
  content: string;
  excerpt: string;
}): Promise<ActionResult & { postId?: string; slug?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登录', error_code: ErrorCode.UNAUTHORIZED };

  let postId = data.postId;

  // No postId yet → create a placeholder post first
  if (!postId) {
    const id = crypto.randomUUID();
    const slug = id.slice(0, 8);
    const { error: insertError } = await supabase.from('posts').insert({
      id,
      author_id: user.id,
      title: data.title || '未命名文章',
      slug,
      content: data.content || '',
      excerpt: data.excerpt || null,
      published: false,
    });
    if (insertError) return { error: insertError.message };
    postId = id;
    // Return postId + slug so the client can update state
    const result: ActionResult & { postId?: string; slug?: string } = {
      postId,
      slug,
    };
    return result;
  }

  // Verify ownership and get slug
  const { data: post } = await supabase
    .from('posts')
    .select('id, slug')
    .eq('id', postId)
    .eq('author_id', user.id)
    .maybeSingle();
  if (!post)
    return { error: '文章不存在或无权操作', error_code: ErrorCode.FORBIDDEN };

  // Upsert draft (post_id is unique, so onConflict handles the upsert correctly)
  const { error: upsertError } = await supabase.from('post_drafts').upsert(
    {
      post_id: postId,
      title: data.title,
      content: data.content,
      excerpt: data.excerpt || null,
    },
    { onConflict: 'post_id' },
  );

  if (upsertError) return { error: upsertError.message };
  return { postId, slug: post.slug };
}

export async function deleteDraft(postId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登录', error_code: ErrorCode.UNAUTHORIZED };

  // Verify ownership
  const { data: post } = await supabase
    .from('posts')
    .select('id')
    .eq('id', postId)
    .eq('author_id', user.id)
    .maybeSingle();
  if (!post)
    return { error: '文章不存在或无权操作', error_code: ErrorCode.FORBIDDEN };

  const { error } = await supabase
    .from('post_drafts')
    .delete()
    .eq('post_id', postId);
  if (error)
    return { error: error.message, error_code: ErrorCode.SERVER_ERROR };

  return {};
}
