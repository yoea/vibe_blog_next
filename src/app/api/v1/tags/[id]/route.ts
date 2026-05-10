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

// DELETE /api/v1/tags/:id — 删除标签
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await validateApiKey(request);
  const authError = authErrorResponse(auth);
  if (authError) return authError;

  const { id } = await params;
  const supabase = await createAdminClient();

  // 检查标签是否存在
  const { data: tag, error: fetchError } = await supabase
    .from('tags')
    .select('id, created_by')
    .eq('id', id)
    .single();

  if (fetchError || !tag)
    return NextResponse.json(
      { error: '标签不存在', error_code: ErrorCode.NOT_FOUND },
      { status: 404 },
    );

  // 检查权限：标签创建者或管理员
  const admin = await isAdmin((auth as { userId: string; keyId: string }).userId);
  if (tag.created_by !== (auth as { userId: string; keyId: string }).userId && !admin)
    return NextResponse.json(
      { error: '只能删除自己创建的标签', error_code: ErrorCode.FORBIDDEN },
      { status: 403 },
    );

  // 删除 post_tags 关联
  const { error: ptError } = await supabase
    .from('post_tags')
    .delete()
    .eq('tag_id', id);
  if (ptError)
    return NextResponse.json(
      {
        error: `删除关联失败: ${ptError.message}`,
        error_code: ErrorCode.SERVER_ERROR,
      },
      { status: 500 },
    );

  // 删除标签
  const { error: deleteError } = await supabase
    .from('tags')
    .delete()
    .eq('id', id);
  if (deleteError)
    return NextResponse.json(
      {
        error: `删除失败: ${deleteError.message}`,
        error_code: ErrorCode.SERVER_ERROR,
      },
      { status: 500 },
    );

  return NextResponse.json({ data: { id } });
}
