import { createAdminClient } from '@/lib/supabase/admin';

export async function validateApiKey(
  request: Request,
): Promise<{ userId: string; keyId: string } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  if (!token) return null;

  const supabase = await createAdminClient();
  const { data } = await supabase
    .from('api_keys')
    .select('id, owner_id')
    .eq('key_value', token)
    .maybeSingle();

  if (!data) return null;

  // 更新最后使用时间（异步，不阻塞验证）
  supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(({ error }) => {
      if (error) console.error('更新 api_key last_used_at 失败:', error);
    });

  return { userId: data.owner_id, keyId: data.id };
}
