import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey } from '@/lib/api/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { ErrorCode } from '@/lib/db/types';

// DELETE /api/v1/comments/:id — 删除评论
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await validateApiKey(request))) {
    return NextResponse.json(
      { error: 'Unauthorized', error_code: ErrorCode.UNAUTHORIZED },
      { status: 401 },
    );
  }

  const { id } = await params;
  const supabase = await createAdminClient();

  const { data: comment, error: fetchError } = await supabase
    .from('post_comments')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (fetchError || !comment) {
    return NextResponse.json(
      { error: '评论不存在', error_code: ErrorCode.NOT_FOUND },
      { status: 404 },
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
