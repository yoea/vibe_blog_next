import { createClient } from '@/lib/supabase/server'

interface RateLimitResult {
  allowed: boolean
  remaining: number
}

/**
 * 检查 IP 在指定时间窗口内的操作频率
 * @param ip 来源 IP
 * @param table 表名（如 'post_comments'）
 * @param maxCount 窗口内最大允许次数
 * @param windowMinutes 时间窗口（分钟）
 */
export async function checkIpRateLimit(
  ip: string,
  table: string,
  maxCount: number,
  windowMinutes: number
): Promise<RateLimitResult> {
  const supabase = await createClient()
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString()

  const { count } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('ip', ip)
    .gte('created_at', since)

  const current = count ?? 0
  return {
    allowed: current < maxCount,
    remaining: Math.max(0, maxCount - current),
  }
}
