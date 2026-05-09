import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { ErrorCode } from '@/lib/db/types';

// POST /api/v1/posts/:slug/comments — 添加评论
export async function POST(
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
    const { content, author, parentId } = body;

    if (!content?.trim()) {
      return NextResponse.json(
        { error: '评论内容不能为空', error_code: ErrorCode.VALIDATION },
        { status: 400 },
      );
    }

    if (content.trim().length > 500) {
      return NextResponse.json(
        {
          error: '评论内容不能超过 500 个字符',
          error_code: ErrorCode.VALIDATION,
        },
        { status: 400 },
      );
    }

    const supabase = await createAdminClient();

    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (postError || !post) {
      return NextResponse.json(
        { error: '文章不存在', error_code: ErrorCode.NOT_FOUND },
        { status: 404 },
      );
    }

    const { data: comment, error: insertError } = await supabase
      .from('post_comments')
      .insert({
        post_id: post.id,
        content: content.trim(),
        parent_id: parentId ?? null,
        guest_name: author?.trim() || 'API Bot',
        ip: 'api',
      })
      .select('id, content, created_at')
      .single();

    if (insertError) {
      return NextResponse.json(
        {
          error: `评论失败: ${insertError.message}`,
          error_code: ErrorCode.SERVER_ERROR,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: comment }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: '请求格式错误', error_code: ErrorCode.VALIDATION },
      { status: 400 },
    );
  }
}
