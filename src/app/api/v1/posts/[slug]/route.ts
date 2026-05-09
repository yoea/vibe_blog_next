import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPostBySlug } from '@/lib/db/queries';
import { ErrorCode } from '@/lib/db/types';

// GET /api/v1/posts/:slug — 获取单篇文章
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!(await validateApiKey(request))) {
    return NextResponse.json(
      { error: 'Unauthorized', error_code: ErrorCode.UNAUTHORIZED },
      { status: 401 },
    );
  }

  const { slug } = await params;
  const { data: post, error } = await getPostBySlug(slug);

  if (!post) {
    return NextResponse.json(
      { error: error || '文章不存在', error_code: ErrorCode.NOT_FOUND },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: post });
}

// PUT /api/v1/posts/:slug — 更新文章
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!(await validateApiKey(request))) {
    return NextResponse.json(
      { error: 'Unauthorized', error_code: ErrorCode.UNAUTHORIZED },
      { status: 401 },
    );
  }

  const { slug } = await params;

  try {
    const body = await request.json();
    const supabase = await createAdminClient();

    const { data: existing, error: fetchError } = await supabase
      .from('posts')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (fetchError || !existing) {
      return NextResponse.json(
        { error: '文章不存在', error_code: ErrorCode.NOT_FOUND },
        { status: 404 },
      );
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (body.title !== undefined) updates.title = body.title?.trim();
    if (body.content !== undefined) updates.content = body.content?.trim();
    if (body.excerpt !== undefined)
      updates.excerpt = body.excerpt?.trim() ?? null;
    if (body.published !== undefined) updates.published = body.published;
    if (body.cover_image_url !== undefined)
      updates.cover_image_url = body.cover_image_url ?? null;

    const { error: updateError } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', existing.id);

    if (updateError) {
      return NextResponse.json(
        {
          error: `更新失败: ${updateError.message}`,
          error_code: ErrorCode.SERVER_ERROR,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: { slug } });
  } catch {
    return NextResponse.json(
      { error: '请求格式错误', error_code: ErrorCode.VALIDATION },
      { status: 400 },
    );
  }
}

// DELETE /api/v1/posts/:slug — 删除文章
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!(await validateApiKey(request))) {
    return NextResponse.json(
      { error: 'Unauthorized', error_code: ErrorCode.UNAUTHORIZED },
      { status: 401 },
    );
  }

  const { slug } = await params;
  const supabase = await createAdminClient();

  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (fetchError || !post) {
    return NextResponse.json(
      { error: '文章不存在', error_code: ErrorCode.NOT_FOUND },
      { status: 404 },
    );
  }

  const { error: deleteError } = await supabase
    .from('posts')
    .delete()
    .eq('id', post.id);

  if (deleteError) {
    return NextResponse.json(
      {
        error: `删除失败: ${deleteError.message}`,
        error_code: ErrorCode.SERVER_ERROR,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: { slug } });
}
