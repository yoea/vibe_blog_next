'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { ErrorCode } from '@/lib/db/types';
import type { ActionResult } from '@/lib/db/types';

// 列出当前用户的所有 API Key
export async function listApiKeys(): Promise<
  ActionResult & {
    keys?: {
      id: string;
      name: string;
      key_prefix: string;
      key_suffix: string;
      created_at: string;
      last_used_at: string | null;
    }[];
  }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登录', error_code: ErrorCode.UNAUTHORIZED };

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, key_value, created_at, last_used_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error)
    return {
      error: `查询失败: ${error.message}`,
      error_code: ErrorCode.SERVER_ERROR,
    };

  return {
    keys: (data ?? []).map((k) => ({
      id: k.id,
      name: k.name,
      key_prefix: k.key_value.slice(0, 6),
      key_suffix: k.key_value.slice(-4),
      created_at: k.created_at,
      last_used_at: k.last_used_at,
    })),
  };
}

// 生成新 API Key（ew- 前缀 + 32 位随机字符），返回完整 key 供弹窗显示
export async function generateApiKey(
  name?: string,
): Promise<ActionResult & { apiKey?: string; id?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登录', error_code: ErrorCode.UNAUTHORIZED };

  const newKey = 'ew-' + crypto.randomUUID().replace(/-/g, '').slice(0, 32);

  const { error, data } = await supabase
    .from('api_keys')
    .insert({
      owner_id: user.id,
      name: name?.trim() || '默认密钥',
      key_value: newKey,
    })
    .select('id')
    .single();

  if (error)
    return {
      error: `生成失败: ${error.message}`,
      error_code: ErrorCode.SERVER_ERROR,
    };

  revalidatePath('/settings');
  return { apiKey: newKey, id: data.id };
}

// 删除指定 API Key
export async function deleteApiKey(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from('api_keys').delete().eq('id', id);

  if (error)
    return {
      error: `删除失败: ${error.message}`,
      error_code: ErrorCode.SERVER_ERROR,
    };

  revalidatePath('/settings');
  return {};
}
