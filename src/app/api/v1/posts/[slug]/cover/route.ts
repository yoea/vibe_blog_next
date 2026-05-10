import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, authErrorResponse } from '@/lib/api/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { ErrorCode } from '@/lib/db/types';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// POST /api/v1/posts/:slug/cover — 上传封面图
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await validateApiKey(request);
  const authError = authErrorResponse(auth);
  if (authError) return authError;

  const { slug } = await params;
  const supabase = await createAdminClient();

  // 查找文章
  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('id, author_id')
    .eq('slug', slug)
    .maybeSingle();

  if (fetchError || !post)
    return NextResponse.json(
      { error: '文章不存在', error_code: ErrorCode.NOT_FOUND },
      { status: 404 },
    );

  // 权限：文章作者或管理员
  const { data: userSettings } = await supabase
    .from('user_settings')
    .select('is_admin')
    .eq('user_id', (auth as { userId: string; keyId: string }).userId)
    .maybeSingle();
  const isAdmin = userSettings?.is_admin ?? false;

  if (post.author_id !== (auth as { userId: string; keyId: string }).userId && !isAdmin)
    return NextResponse.json(
      { error: '无权限', error_code: ErrorCode.FORBIDDEN },
      { status: 403 },
    );

  try {
    const formData = await request.formData();
    const file = formData.get('cover') as File;

    if (!file)
      return NextResponse.json(
        {
          error: '缺少 cover 字段（图片文件）',
          error_code: ErrorCode.VALIDATION,
        },
        { status: 400 },
      );

    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json(
        {
          error: '仅支持 JPG、PNG、WebP 格式',
          error_code: ErrorCode.VALIDATION,
        },
        { status: 400 },
      );

    if (file.size > MAX_FILE_SIZE)
      return NextResponse.json(
        { error: '封面图不能超过 2MB', error_code: ErrorCode.VALIDATION },
        { status: 400 },
      );

    const bytes = await file.arrayBuffer();
    const ext =
      file.type === 'image/png'
        ? 'png'
        : file.type === 'image/webp'
          ? 'webp'
          : 'jpg';
    const timestamp = Date.now();
    const fileName = `${(auth as { userId: string; keyId: string }).userId}/cover_${post.id}_${timestamp}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('covers')
      .upload(fileName, bytes, { contentType: file.type });

    if (uploadError)
      return NextResponse.json(
        {
          error: `上传失败: ${uploadError.message}`,
          error_code: ErrorCode.SERVER_ERROR,
        },
        { status: 500 },
      );

    const { data: urlData } = supabase.storage
      .from('covers')
      .getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    // 更新文章封面 URL
    const { error: updateError } = await supabase
      .from('posts')
      .update({ cover_image_url: publicUrl })
      .eq('id', post.id);

    if (updateError)
      return NextResponse.json(
        {
          error: `保存失败: ${updateError.message}`,
          error_code: ErrorCode.SERVER_ERROR,
        },
        { status: 500 },
      );

    return NextResponse.json({ data: { cover_image_url: publicUrl } });
  } catch {
    return NextResponse.json(
      {
        error: '请求格式错误（需使用 multipart/form-data）',
        error_code: ErrorCode.VALIDATION,
      },
      { status: 400 },
    );
  }
}

// DELETE /api/v1/posts/:slug/cover — 移除封面图
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await validateApiKey(request);
  const authError = authErrorResponse(auth);
  if (authError) return authError;

  const { slug } = await params;
  const supabase = await createAdminClient();

  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('id, author_id')
    .eq('slug', slug)
    .maybeSingle();

  if (fetchError || !post)
    return NextResponse.json(
      { error: '文章不存在', error_code: ErrorCode.NOT_FOUND },
      { status: 404 },
    );

  const { data: userSettings } = await supabase
    .from('user_settings')
    .select('is_admin')
    .eq('user_id', (auth as { userId: string; keyId: string }).userId)
    .maybeSingle();
  const isAdmin = userSettings?.is_admin ?? false;

  if (post.author_id !== (auth as { userId: string; keyId: string }).userId && !isAdmin)
    return NextResponse.json(
      { error: '无权限', error_code: ErrorCode.FORBIDDEN },
      { status: 403 },
    );

  const { error: updateError } = await supabase
    .from('posts')
    .update({ cover_image_url: null })
    .eq('id', post.id);

  if (updateError)
    return NextResponse.json(
      {
        error: `移除失败: ${updateError.message}`,
        error_code: ErrorCode.SERVER_ERROR,
      },
      { status: 500 },
    );

  return NextResponse.json({ data: { slug } });
}
