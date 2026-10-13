import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, authErrorResponse } from '@/lib/api/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { ErrorCode } from '@/lib/db/types';

// DELETE /api/v1/comments/:id — 删除评论
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await validateApiKey(request);
  const authError = authErrorResponse(auth);
  if (authError) return authError;

  const { id } = await params;
  const userId = (auth as { userId: string; keyId: string }).userId;
  const supabase = await createAdminClient();

  const { data: comment, error: fetchError } = await supabase
    .from('post_comments')
    .select('id, author_id, post_id')
    .eq('id', id)
    .maybeSingle();

  if (fetchError || !comment) {
    return NextResponse.json(
      { error: '评论不存在', error_code: ErrorCode.NOT_FOUND },
      { status: 404 },
    );
  }

  // Service Role 绕过 RLS，此处必须复刻 own_comment_delete + post_author_comment_delete
  // 两条策略的并集：评论作者本人，或被评论文章的作者，可删除该评论
  const { data: post } = await supabase
    .from('posts')
    .select('author_id')
    .eq('id', comment.post_id)
    .maybeSingle();

  if (comment.author_id !== userId && post?.author_id !== userId) {
    return NextResponse.json(
      { error: '无权删除他人评论', error_code: ErrorCode.FORBIDDEN },
      { status: 403 },
    );
  }

  const { error: deleteError } = await supabase
    .from('post_comments')
    .delete()
    .eq('id', id);

  if (deleteError) {
    return NextResponse.json(
      {
        error: `删除失败: ${deleteError.message}`,
        error_code: ErrorCode.SERVER_ERROR,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: { id } });
}
