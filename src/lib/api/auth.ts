import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { ErrorCode } from '@/lib/db/types';

const API_RATE_LIMIT = 60; // 每小时每个 key 最多 60 次请求
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 小时

export type AuthResult =
  | { userId: string; keyId: string }
  | { error: 'unauthorized' }
  | { error: 'rate_limited' }
  | null;

export async function validateApiKey(
  request: Request,
): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  if (!token) return null;

  const supabase = await createAdminClient();
  const { data } = await supabase
    .from('api_keys')
    .select('id, owner_id, request_count, window_start')
    .eq('key_value', token)
    .maybeSingle();

  if (!data) return { error: 'unauthorized' };

  // 限流检查（滑动窗口，每小时 60 次）
  const now = Date.now();
  const windowStart = data.window_start
    ? new Date(data.window_start).getTime()
    : 0;
  const windowAge = now - windowStart;
  const count = windowAge > RATE_WINDOW_MS ? 0 : (data.request_count ?? 0);

  if (count >= API_RATE_LIMIT) {
    return { error: 'rate_limited' };
  }

  // 更新计数和窗口（异步，不阻塞请求）
  const newCount = windowAge > RATE_WINDOW_MS ? 1 : count + 1;
  const newWindowStart =
    windowAge > RATE_WINDOW_MS
      ? new Date().toISOString()
      : data.window_start;

  supabase
    .from('api_keys')
    .update({
      request_count: newCount,
      window_start: newWindowStart,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', data.id)
    .then(({ error }) => {
      if (error) console.error('更新 api_key 使用状态失败:', error);
    });

  return { userId: data.owner_id, keyId: data.id };
}

/** 将 validateApiKey 的非成功结果转为 HTTP 响应，成功返回 null */
export function authErrorResponse(auth: AuthResult) {
  if (!auth || 'userId' in auth) return null;
  if (auth.error === 'rate_limited') {
    return NextResponse.json(
      { error: '请求过于频繁，请稍后再试', error_code: ErrorCode.RATE_LIMITED },
      { status: 429 },
    );
  }
  return NextResponse.json(
    { error: 'Unauthorized', error_code: ErrorCode.UNAUTHORIZED },
    { status: 401 },
  );
}
