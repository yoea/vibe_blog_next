import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { ErrorCode } from '@/lib/db/types';

// POST /api/v1/posts/:slug/like — 切换点赞
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

  // 使用固定 IP 标识 API 来源
  const { data: existing, error: checkError } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', post.id)
    .eq('ip', 'api')
    .maybeSingle();

  if (checkError) {
    return NextResponse.json(
      {
        error: `操作失败: ${checkError.message}`,
        error_code: ErrorCode.SERVER_ERROR,
      },
      { status: 500 },
    );
  }

  if (existing) {
    // 取消点赞
    const { error: deleteError } = await supabase
      .from('post_likes')
      .delete()
      .eq('id', existing.id);

    if (deleteError) {
      return NextResponse.json(
        {
          error: `取消点赞失败: ${deleteError.message}`,
          error_code: ErrorCode.SERVER_ERROR,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: { liked: false } });
  }

  // 添加点赞
  const { error: insertError } = await supabase.from('post_likes').insert({
    post_id: post.id,
    ip: 'api',
  });

  if (insertError) {
    return NextResponse.json(
      {
        error: `点赞失败: ${insertError.message}`,
        error_code: ErrorCode.SERVER_ERROR,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: { liked: true } });
}
