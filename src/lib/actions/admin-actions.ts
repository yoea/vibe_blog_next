'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSuperAdmin } from '@/lib/utils/admin';
import { revalidatePath } from 'next/cache';
import { ErrorCode } from '@/lib/db/types';
import type { ActionResult } from '@/lib/db/types';

export async function deleteUserAsAdmin(
  targetUserId: string,
): Promise<ActionResult> {
  if (!(await isSuperAdmin()))
    return { error: '无权限', error_code: ErrorCode.FORBIDDEN };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: '服务器未配置', error_code: ErrorCode.SERVER_ERROR };
  }

  // Mark user_settings as deleted
  await admin
    .from('user_settings')
    .update({
      display_name: `用户${targetUserId.slice(0, 4)}已注销`,
      is_deleted: true,
      deleted_at: new Date().toISOString(),
    })
    .eq('user_id', targetUserId);

  // Clear comment email references
  await admin
    .from('post_comments')
    .update({ author_email: null })
    .eq('author_id', targetUserId);

  // Scramble auth credentials so login is impossible
  await admin.auth.admin.updateUserById(targetUserId, {
    email: `deleted-${targetUserId.slice(0, 8)}@deleted.local`,
    password: crypto.randomUUID(),
  });

  revalidatePath('/author');
  return {};
}

export async function toggleMaintenanceMode(): Promise<ActionResult> {
  if (!(await isSuperAdmin()))
    return { error: '无权限', error_code: ErrorCode.FORBIDDEN };

  const supabase = await createClient();

  // 读取当前状态
  const { data: config } = await supabase
    .from('site_config')
    .select('value')
    .eq('key', 'maintenance_mode')
    .single();

  const newValue = config?.value === 'true' ? 'false' : 'true';

  // 写入（通过 RLS 策略控制权限，is_admin 用户可写）
  const { error } = await supabase
    .from('site_config')
    .update({ value: newValue, updated_at: new Date().toISOString() })
    .eq('key', 'maintenance_mode');

  if (error)
    return { error: error.message, error_code: ErrorCode.SERVER_ERROR };

  revalidatePath('/');
  return {};
}

export async function updateAIConfig(
  baseUrl: string,
  apiKey: string,
  model: string,
): Promise<ActionResult> {
  if (!(await isSuperAdmin()))
    return { error: '无权限', error_code: ErrorCode.FORBIDDEN };

  const supabase = await createClient();

  const updates = [
    { key: 'ai_base_url', value: baseUrl },
    { key: 'ai_api_key', value: apiKey },
    { key: 'ai_model', value: model },
  ];

  for (const { key, value } of updates) {
    const { error } = await supabase
      .from('site_config')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key);

    if (error)
      return {
        error: `更新 ${key} 失败: ${error.message}`,
        error_code: ErrorCode.SERVER_ERROR,
      };
  }

  revalidatePath('/settings');
  return {};
}

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

export async function toggleDeployNotify(): Promise<ActionResult> {
  if (!(await isSuperAdmin()))
    return { error: '无权限', error_code: ErrorCode.FORBIDDEN };

  const supabase = await createClient();

  const { data: config } = await supabase
    .from('site_config')
    .select('value')
    .eq('key', 'show_deploy_notify')
    .single();

  const newValue = config?.value === 'true' ? 'false' : 'true';

  const { error } = await supabase
    .from('site_config')
    .update({ value: newValue, updated_at: new Date().toISOString() })
    .eq('key', 'show_deploy_notify');

  if (error)
    return { error: error.message, error_code: ErrorCode.SERVER_ERROR };

  revalidatePath('/settings');
  return {};
}

export async function saveAIModels(models: string[]): Promise<ActionResult> {
  if (!(await isSuperAdmin()))
    return { error: '无权限', error_code: ErrorCode.FORBIDDEN };

  const supabase = await createClient();

  // 先尝试 update
  const { error: updateErr } = await supabase
    .from('site_config')
    .update({
      value: JSON.stringify(models),
      updated_at: new Date().toISOString(),
    })
    .eq('key', 'ai_models');

  if (updateErr) {
    return {
      error: `保存模型列表失败: ${updateErr.message}`,
      error_code: ErrorCode.SERVER_ERROR,
    };
  }

  // update 成功但可能行不存在（affected rows = 0），尝试 insert
  const { data: existing } = await supabase
    .from('site_config')
    .select('key')
    .eq('key', 'ai_models')
    .maybeSingle();

  if (!existing) {
    const { error: insertErr } = await supabase
      .from('site_config')
      .insert({ key: 'ai_models', value: JSON.stringify(models) });

    if (insertErr)
      return {
        error: `保存模型列表失败: ${insertErr.message}`,
        error_code: ErrorCode.SERVER_ERROR,
      };
  }

  return {};
}

export async function updateICPConfig(
  number: string,
  visible: boolean,
): Promise<ActionResult> {
  if (!(await isSuperAdmin()))
    return { error: '无权限', error_code: ErrorCode.FORBIDDEN };

  const supabase = await createClient();

  const updates = [
    { key: 'icp_number', value: number },
    { key: 'icp_visible', value: String(visible) },
  ];

  for (const { key, value } of updates) {
    const { error } = await supabase
      .from('site_config')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key);

    if (error)
      return {
        error: `更新 ${key} 失败: ${error.message}`,
        error_code: ErrorCode.SERVER_ERROR,
      };
  }

  revalidatePath('/settings');
  revalidatePath('/');
  return {};
}
