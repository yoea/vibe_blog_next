import { createAdminClient } from '@/lib/supabase/admin';

// 验证 API Key 有效性。持有有效 api_key 即拥有超级管理员权限。
export async function validateApiKey(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);
  if (!token) return false;

  const supabase = await createAdminClient();
  const { data } = await supabase
    .from('site_config')
    .select('value')
    .eq('key', 'api_key')
    .maybeSingle();

  return data?.value === token && token.length > 0;
}
