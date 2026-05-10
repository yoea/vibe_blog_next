import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, authErrorResponse } from '@/lib/api/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { ErrorCode } from '@/lib/db/types';

const DOC_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DOC_ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
];

const IMAGE_MAX_SIZE = 2 * 1024 * 1024; // 2MB
const IMAGE_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function getExtFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      'pptx',
    'text/plain': 'txt',
    'text/csv': 'csv',
    'application/zip': 'zip',
    'application/x-zip-compressed': 'zip',
  };
  return map[mimeType] || 'bin';
}

// POST /api/v1/attachments — 上传附件（图片或文档）
export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  const authError = authErrorResponse(auth);
  if (authError) return authError;

  const userId = (auth as { userId: string; keyId: string }).userId;
  const supabase = await createAdminClient();

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file)
      return NextResponse.json(
        {
          error: '缺少 file 字段（附件文件）',
          error_code: ErrorCode.VALIDATION,
        },
        { status: 400 },
      );

    const isImage = IMAGE_ALLOWED_TYPES.includes(file.type);
    const isDoc = DOC_ALLOWED_TYPES.includes(file.type);

    if (!isImage && !isDoc)
      return NextResponse.json(
        {
          error: '不支持的文件格式',
          error_code: ErrorCode.VALIDATION,
        },
        { status: 400 },
      );

    if (isImage && file.size > IMAGE_MAX_SIZE)
      return NextResponse.json(
        { error: '图片不能超过 2MB', error_code: ErrorCode.VALIDATION },
        { status: 400 },
      );

    if (isDoc && file.size > DOC_MAX_SIZE)
      return NextResponse.json(
        { error: '文档不能超过 10MB', error_code: ErrorCode.VALIDATION },
        { status: 400 },
      );

    const bucket = isImage ? 'images' : 'attachments';
    const bytes = await file.arrayBuffer();
    const timestamp = Date.now();
    const ext = isImage
      ? file.type === 'image/png'
        ? 'png'
        : file.type === 'image/webp'
          ? 'webp'
          : 'jpg'
      : getExtFromMime(file.type);
    const prefix = isImage ? 'img' : 'doc';
    const storagePath = `${userId}/${prefix}_${timestamp}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, bytes, { contentType: file.type });

    if (uploadError)
      return NextResponse.json(
        {
          error: `上传失败: ${uploadError.message}`,
          error_code: ErrorCode.SERVER_ERROR,
        },
        { status: 500 },
      );

    // Create metadata record
    const { data: record, error: insertError } = await supabase
      .from('user_attachments')
      .insert({
        user_id: userId,
        bucket,
        storage_path: storagePath,
        original_name: file.name,
        mime_type: file.type,
        size: file.size,
      })
      .select()
      .single();

    if (insertError)
      return NextResponse.json(
        {
          error: `记录创建失败: ${insertError.message}`,
          error_code: ErrorCode.SERVER_ERROR,
        },
        { status: 500 },
      );

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    return NextResponse.json({
      data: {
        url: urlData.publicUrl,
        id: record.id,
        size: file.size,
        mime_type: file.type,
      },
    });
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

// DELETE /api/v1/attachments?id=xxx — 删除附件
export async function DELETE(request: NextRequest) {
  const auth = await validateApiKey(request);
  const authError = authErrorResponse(auth);
  if (authError) return authError;

  const userId = (auth as { userId: string; keyId: string }).userId;
  const supabase = await createAdminClient();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id)
    return NextResponse.json(
      { error: '缺少附件 id', error_code: ErrorCode.VALIDATION },
      { status: 400 },
    );

  // Fetch record to verify ownership and get storage path
  const { data: record, error: fetchError } = await supabase
    .from('user_attachments')
    .select('bucket, storage_path')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError || !record)
    return NextResponse.json(
      { error: '附件不存在', error_code: ErrorCode.NOT_FOUND },
      { status: 404 },
    );

  // Delete from storage
  await supabase.storage.from(record.bucket).remove([record.storage_path]);

  // Delete metadata record
  const { error: deleteError } = await supabase
    .from('user_attachments')
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

  return NextResponse.json({ data: { success: true } });
}
