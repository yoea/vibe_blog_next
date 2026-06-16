'use server';

import { lookup } from 'node:dns/promises';
import { createClient } from '@/lib/supabase/server';
import { ErrorCode } from '@/lib/db/types';
import type { ActionResult } from '@/lib/db/types';

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

export interface AttachmentItem {
  id: string;
  bucket: string;
  storagePath: string;
  originalName: string;
  mimeType: string;
  size: number;
  description: string | null;
  createdAt: string;
  url: string;
}

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

export async function listUserAttachments(
  bucket?: 'images' | 'attachments',
): Promise<ActionResult & { items?: AttachmentItem[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登录', error_code: ErrorCode.UNAUTHORIZED };

  let query = supabase
    .from('user_attachments')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (bucket) query = query.eq('bucket', bucket);

  const { data, error } = await query;

  if (error)
    return {
      error: `查询失败: ${error.message}`,
      error_code: ErrorCode.SERVER_ERROR,
    };

  const items: AttachmentItem[] = ((data ?? []) as any[]).map((row) => {
    const { data: urlData } = supabase.storage
      .from(row.bucket)
      .getPublicUrl(row.storage_path);
    return {
      id: row.id,
      bucket: row.bucket,
      storagePath: row.storage_path,
      originalName: row.original_name,
      mimeType: row.mime_type,
      size: row.size,
      description: row.description,
      createdAt: row.created_at,
      url: urlData.publicUrl,
    };
  });

  return { items };
}

export async function uploadAttachment(
  formData: FormData,
): Promise<ActionResult & { item?: AttachmentItem }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登录', error_code: ErrorCode.UNAUTHORIZED };

  const file = formData.get('file') as File;
  if (!file) return { error: '未选择文件', error_code: ErrorCode.VALIDATION };

  const isImage = IMAGE_ALLOWED_TYPES.includes(file.type);
  const isDoc = DOC_ALLOWED_TYPES.includes(file.type);

  if (!isImage && !isDoc)
    return {
      error: '不支持的文件格式',
      error_code: ErrorCode.VALIDATION,
    };

  if (isImage && file.size > IMAGE_MAX_SIZE)
    return { error: '图片不能超过 2MB', error_code: ErrorCode.VALIDATION };

  if (isDoc && file.size > DOC_MAX_SIZE)
    return { error: '文档不能超过 10MB', error_code: ErrorCode.VALIDATION };

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
  const storagePath = `${user.id}/${prefix}_${timestamp}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, bytes, { contentType: file.type });

  if (uploadError)
    return {
      error: `上传失败: ${uploadError.message}`,
      error_code: ErrorCode.SERVER_ERROR,
    };

  // Create metadata record
  const { data: record, error: insertError } = await supabase
    .from('user_attachments')
    .insert({
      user_id: user.id,
      bucket,
      storage_path: storagePath,
      original_name: file.name,
      mime_type: file.type,
      size: file.size,
    })
    .select()
    .single();

  if (insertError)
    return {
      error: `记录创建失败: ${insertError.message}`,
      error_code: ErrorCode.SERVER_ERROR,
    };

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(storagePath);

  return {
    item: {
      id: record.id,
      bucket,
      storagePath,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      description: null,
      createdAt: record.created_at,
      url: urlData.publicUrl,
    },
  };
}

export async function deleteAttachment(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登录', error_code: ErrorCode.UNAUTHORIZED };

  // Fetch record to get storage path
  const { data: record, error: fetchError } = await supabase
    .from('user_attachments')
    .select('bucket, storage_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (fetchError || !record)
    return { error: '附件不存在', error_code: ErrorCode.NOT_FOUND };

  // Delete from storage
  await supabase.storage.from(record.bucket).remove([record.storage_path]);

  // Delete metadata record
  const { error: deleteError } = await supabase
    .from('user_attachments')
    .delete()
    .eq('id', id);

  if (deleteError)
    return {
      error: `删除失败: ${deleteError.message}`,
      error_code: ErrorCode.SERVER_ERROR,
    };

  return {};
}

export async function updateAttachmentDescription(
  id: string,
  description: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登录', error_code: ErrorCode.UNAUTHORIZED };

  const { error } = await supabase
    .from('user_attachments')
    .update({ description: description.trim() || null })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error)
    return {
      error: `更新失败: ${error.message}`,
      error_code: ErrorCode.SERVER_ERROR,
    };

  return {};
}

export async function replaceImage(
  formData: FormData,
): Promise<ActionResult & { url?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登录', error_code: ErrorCode.UNAUTHORIZED };

  const file = formData.get('file') as File;
  const storagePath = formData.get('storagePath') as string;

  if (!file || !storagePath)
    return { error: '参数不完整', error_code: ErrorCode.VALIDATION };

  if (!IMAGE_ALLOWED_TYPES.includes(file.type))
    return {
      error: '仅支持 JPG, PNG, WebP 格式',
      error_code: ErrorCode.VALIDATION,
    };

  if (file.size > IMAGE_MAX_SIZE)
    return { error: '图片不能超过 2MB', error_code: ErrorCode.VALIDATION };

  // Verify ownership
  const { data: record } = await supabase
    .from('user_attachments')
    .select('id')
    .eq('storage_path', storagePath)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!record)
    return { error: '附件不存在', error_code: ErrorCode.NOT_FOUND };

  const bytes = await file.arrayBuffer();

  // Upload with overwrite (same path)
  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(storagePath, bytes, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError)
    return {
      error: `替换失败: ${uploadError.message}`,
      error_code: ErrorCode.SERVER_ERROR,
    };

  // Update size in metadata
  await supabase
    .from('user_attachments')
    .update({ size: file.size })
    .eq('id', record.id);

  const { data: urlData } = supabase.storage
    .from('images')
    .getPublicUrl(storagePath);

  return { url: urlData.publicUrl };
}

// ---------------------------------------------------------------------------
// Compatibility wrappers (migrated from image-actions.ts)
// ---------------------------------------------------------------------------

/**
 * 上传编辑器内图片 — 包装 uploadAttachment，保持原有返回格式 { imageUrl }。
 * FormData key: `image`（区别于附件的 `file`）
 */
export async function uploadContentImage(
  formData: FormData,
): Promise<ActionResult & { imageUrl?: string }> {
  // Re-map 'image' -> 'file' so uploadAttachment can read it
  const file = formData.get('image') as File | null;
  if (!file)
    return { error: '未选择文件', error_code: ErrorCode.VALIDATION };

  const mapped = new FormData();
  mapped.append('file', file);

  const result = await uploadAttachment(mapped);
  if (result.error) return result;

  return { imageUrl: result.item?.url };
}

/**
 * 列出当前用户的所有图片 — 包装 listUserAttachments('images')。
 * 返回格式与原 image-actions.ts 一致：{ images: { url, name, createdAt }[] }
 */
export async function listUserImages(): Promise<
  ActionResult & { images?: { url: string; name: string; createdAt: string }[] }
> {
  const result = await listUserAttachments('images');
  if (result.error) return result;

  const images = (result.items ?? []).map((item) => ({
    url: item.url,
    name: item.originalName,
    createdAt: item.createdAt,
  }));

  return { images };
}

// ---------------------------------------------------------------------------
// fetchImageFromUrl (migrated from image-actions.ts)
// ---------------------------------------------------------------------------

const PRIVATE_IP_RE =
  /^(0\.|10\.|127\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|::1$|fc|fd|fe80)/;

async function isPrivateHost(hostname: string): Promise<boolean> {
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  )
    return true;
  try {
    const { address } = await lookup(hostname);
    return PRIVATE_IP_RE.test(address);
  } catch {
    return true; // DNS failure -> treat as unsafe
  }
}

export async function fetchImageFromUrl(
  url: string,
): Promise<ActionResult & { dataUrl?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登录', error_code: ErrorCode.UNAUTHORIZED };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { error: '无效的 URL', error_code: ErrorCode.VALIDATION };
  }
  if (!['http:', 'https:'].includes(parsed.protocol))
    return {
      error: '仅支持 http/https 协议',
      error_code: ErrorCode.VALIDATION,
    };

  if (await isPrivateHost(parsed.hostname))
    return {
      error: '不允许访问内网地址',
      error_code: ErrorCode.VALIDATION,
    };

  try {
    const res = await fetch(parsed.href, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'VibeBlog/1.0' },
    });
    if (!res.ok)
      return {
        error: `获取图片失败: ${res.status}`,
        error_code: ErrorCode.SERVER_ERROR,
      };

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.startsWith('image/'))
      return {
        error: 'URL 不是图片资源',
        error_code: ErrorCode.VALIDATION,
      };

    const bytes = await res.arrayBuffer();
    if (bytes.byteLength > 10 * 1024 * 1024)
      return {
        error: '图片过大（限 10MB）',
        error_code: ErrorCode.VALIDATION,
      };

    const base64 = Buffer.from(bytes).toString('base64');
    return { dataUrl: `data:${contentType};base64,${base64}` };
  } catch {
    return {
      error: '获取图片超时或失败',
      error_code: ErrorCode.SERVER_ERROR,
    };
  }
}
