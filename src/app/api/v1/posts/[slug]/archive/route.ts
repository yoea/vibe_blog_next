import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, authErrorResponse } from '@/lib/api/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { ErrorCode } from '@/lib/db/types';

async function isAdmin(userId: string): Promise<boolean> {
  const supabase = await createAdminClient();
  const { data } = await supabase
    .from('user_settings')
    .select('is_admin')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.is_admin ?? false;
}

// POST /api/v1/posts/:slug/archive — 归档文章
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await validateApiKey(request);
  const authError = authErrorResponse(auth);
  if (authError) return authError;

  if (!(await isAdmin((auth as { userId: string; keyId: string }).userId)))
    return NextResponse.json(
      { error: '仅管理员可归档', error_code: ErrorCode.FORBIDDEN },
      { status: 403 },
    );

  const { slug } = await params;
  const supabase = await createAdminClient();

  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .single();

  if (fetchError || !post)
    return NextResponse.json(
      { error: '文章不存在', error_code: ErrorCode.NOT_FOUND },
      { status: 404 },
    );

  // 读取标签
  const { data: postTags } = await supabase
    .from('post_tags')
    .select('tags(name, slug, color)')
    .eq('post_id', post.id);
  const tags = (postTags ?? []).map((pt: any) => pt.tags).filter(Boolean);

  // 写入归档表
  const { error: insertError } = await supabase
    .from('articles_archive')
    .insert({
      original_id: post.id,
      author_id: post.author_id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      excerpt: post.excerpt,
      cover_image_url: post.cover_image_url,
      published: post.published,
      is_pinned: post.is_pinned,
      created_at: post.created_at,
      updated_at: post.updated_at,
      archived_at: new Date().toISOString(),
      archived_by: (auth as { userId: string; keyId: string }).userId,
      tags: tags.length > 0 ? tags : null,
    });

  if (insertError)
    return NextResponse.json(
      {
        error: `归档失败: ${insertError.message}`,
        error_code: ErrorCode.SERVER_ERROR,
      },
      { status: 500 },
    );

  // 删除原文章
  const { error: deleteError } = await supabase
    .from('posts')
    .delete()
    .eq('id', post.id);

  if (deleteError)
    return NextResponse.json(
      {
        error: `删除原文章失败: ${deleteError.message}`,
        error_code: ErrorCode.SERVER_ERROR,
      },
      { status: 500 },
    );

  return NextResponse.json({ data: { slug } });
}

// DELETE /api/v1/posts/:slug/archive — 取消归档（还原文章）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await validateApiKey(request);
  const authError = authErrorResponse(auth);
  if (authError) return authError;

  if (!(await isAdmin((auth as { userId: string; keyId: string }).userId)))
    return NextResponse.json(
      { error: '仅管理员可操作', error_code: ErrorCode.FORBIDDEN },
      { status: 403 },
    );

  const { slug } = await params;
  const supabase = await createAdminClient();

  // 查找归档记录
  const { data: archived, error: fetchError } = await supabase
    .from('articles_archive')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (fetchError || !archived)
    return NextResponse.json(
      { error: '归档文章不存在', error_code: ErrorCode.NOT_FOUND },
      { status: 404 },
    );

  // 检查 slug 冲突
  let resolvedSlug = archived.slug;
  const { data: existing } = await supabase
    .from('posts')
    .select('id')
    .eq('slug', resolvedSlug)
    .maybeSingle();

  if (existing)
    resolvedSlug = `${resolvedSlug}-restored-${Date.now().toString(36).slice(-4)}`;

  // 还原到 posts 表
  const { error: insertError } = await supabase.from('posts').insert({
    id: archived.original_id,
    author_id: archived.author_id,
    title: archived.title,
    slug: resolvedSlug,
    content: archived.content,
    excerpt: archived.excerpt,
    cover_image_url: archived.cover_image_url,
    published: archived.published,
    is_pinned: archived.is_pinned,
    created_at: archived.created_at,
    updated_at: archived.updated_at,
  });

  if (insertError)
    return NextResponse.json(
      {
        error: `还原失败: ${insertError.message}`,
        error_code: ErrorCode.SERVER_ERROR,
      },
      { status: 500 },
    );

  // 恢复标签关联
  const archivedTags: { name: string; slug: string; color: string }[] | null = (
    archived as any
  ).tags;
  if (archivedTags && archivedTags.length > 0) {
    for (const tag of archivedTags) {
      const { data: existingTag } = await supabase
        .from('tags')
        .select('id')
        .eq('slug', tag.slug)
        .maybeSingle();

      let tagId: string | null = existingTag?.id ?? null;
      if (!tagId) {
        const { data: newTag } = await supabase
          .from('tags')
          .insert({ name: tag.name, slug: tag.slug, color: tag.color })
          .select('id')
          .single();
        tagId = newTag?.id ?? null;
      }
      if (tagId) {
        await supabase
          .from('post_tags')
          .insert({ post_id: archived.original_id, tag_id: tagId })
          .maybeSingle();
      }
    }
  }

  // 删除归档记录
  await supabase.from('articles_archive').delete().eq('id', archived.id);

  return NextResponse.json({ data: { slug: resolvedSlug } });
}
