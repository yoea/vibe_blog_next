'use server';

import { lookup } from 'node:dns/promises';
import { createClient } from '@/lib/supabase/server';
import { ErrorCode } from '@/lib/db/types';
import type { ActionResult } from '@/lib/db/types';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function uploadContentImage(
  formData: FormData,
): Promise<ActionResult & { imageUrl?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登录', error_code: ErrorCode.UNAUTHORIZED };

  const file = formData.get('image') as File;
  if (!file) return { error: '未选择文件', error_code: ErrorCode.VALIDATION };

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      error: '仅支持 JPG, PNG, WebP 格式',
      error_code: ErrorCode.VALIDATION,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: '图片不能超过 2MB', error_code: ErrorCode.VALIDATION };
  }

  const bytes = await file.arrayBuffer();
  const ext =
    file.type === 'image/png'
      ? 'png'
      : file.type === 'image/webp'
        ? 'webp'
        : 'jpg';
  const timestamp = Date.now();
  const fileName = `${user.id}/img_${timestamp}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(fileName, bytes, { contentType: file.type });

  if (uploadError)
    return {
      error: `上传失败: ${uploadError.message}`,
      error_code: ErrorCode.SERVER_ERROR,
    };

  const { data: urlData } = supabase.storage
    .from('images')
    .getPublicUrl(fileName);

  // Create metadata record
  await supabase.from('user_attachments').insert({
    user_id: user.id,
    bucket: 'images',
    storage_path: fileName,
    original_name: file.name,
    mime_type: file.type,
    size: file.size,
  });

  return { imageUrl: urlData.publicUrl };
}

export async function listUserImages(): Promise<
  ActionResult & { images?: { url: string; name: string; createdAt: string }[] }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登录', error_code: ErrorCode.UNAUTHORIZED };

  const { data, error } = await supabase.storage
    .from('images')
    .list(user.id, {
      limit: 50,
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (error)
    return {
      error: `查询失败: ${error.message}`,
      error_code: ErrorCode.SERVER_ERROR,
    };

  const images = (data ?? [])
    .filter((f) => f.name.startsWith('img_'))
    .map((f) => {
      const path = `${user.id}/${f.name}`;
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(path);
      return {
        url: urlData.publicUrl,
        name: f.name,
        createdAt: f.created_at ?? '',
      };
    });

  return { images };
}

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
    return true; // DNS failure → treat as unsafe
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
