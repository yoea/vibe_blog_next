'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ErrorCode } from '@/lib/db/types';
import type { ActionResult } from '@/lib/db/types';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function uploadCoverImage(
  formData: FormData,
): Promise<ActionResult & { coverUrl?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登录', error_code: ErrorCode.UNAUTHORIZED };

  const file = formData.get('cover') as File;
  if (!file) return { error: '未选择文件', error_code: ErrorCode.VALIDATION };

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      error: '仅支持 JPG, PNG, WebP 格式',
      error_code: ErrorCode.VALIDATION,
    };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: '封面图不能超过 2MB', error_code: ErrorCode.VALIDATION };
  }

  const postId = formData.get('postId') as string;
  if (!postId)
    return { error: '缺少文章 ID', error_code: ErrorCode.VALIDATION };

  const bytes = await file.arrayBuffer();
  const ext =
    file.type === 'image/png'
      ? 'png'
      : file.type === 'image/webp'
        ? 'webp'
        : 'jpg';
  const timestamp = Date.now();
  const fileName = `${user.id}/cover_${postId}_${timestamp}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('covers')
    .upload(fileName, bytes, { contentType: file.type });

  if (uploadError)
    return {
      error: `上传失败: ${uploadError.message}`,
      error_code: ErrorCode.SERVER_ERROR,
    };

  const { data: urlData } = supabase.storage
    .from('covers')
    .getPublicUrl(fileName);

  const publicUrl = urlData.publicUrl;

  const { error: dbError } = await supabase
    .from('posts')
    .update({ cover_image_url: publicUrl })
    .eq('id', postId)
    .eq('author_id', user.id);

  if (dbError)
    return {
      error: `保存失败: ${dbError.message}`,
      error_code: ErrorCode.SERVER_ERROR,
    };

  revalidatePath('/');
  revalidatePath('/profile');

  return { coverUrl: publicUrl };
}

export async function removeCoverImage(postId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登录', error_code: ErrorCode.UNAUTHORIZED };

  const { error } = await supabase
    .from('posts')
    .update({ cover_image_url: null })
    .eq('id', postId)
    .eq('author_id', user.id);

  if (error)
    return { error: error.message, error_code: ErrorCode.SERVER_ERROR };

  revalidatePath('/');
  revalidatePath('/profile');

  return {};
}
