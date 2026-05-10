import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, authErrorResponse } from '@/lib/api/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { ErrorCode } from '@/lib/db/types';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// POST /api/v1/images — 上传图片（通用，返回公开 URL）
export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  const authError = authErrorResponse(auth);
  if (authError) return authError;

  const userId = (auth as { userId: string; keyId: string }).userId;
  const supabase = await createAdminClient();

  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file)
      return NextResponse.json(
        {
          error: '缺少 image 字段（图片文件）',
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
        { error: '图片不能超过 2MB', error_code: ErrorCode.VALIDATION },
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
    const fileName = `${userId}/img_${timestamp}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('images')
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
      .from('images')
      .getPublicUrl(fileName);

    return NextResponse.json({ data: { url: urlData.publicUrl } });
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
