export function formatTimeAgo(date: string | Date): string {
  const now = new Date()
  const then = date instanceof Date ? date : new Date(date)
  const diffMs = now.getTime() - then.getTime()
  if (diffMs < 0) return then.toLocaleDateString('zh-CN')

  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return `${seconds}秒前`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}天前`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}个月前`
  return `${Math.floor(months / 12)}年前`
}

export function formatDaysAgo(date: string | Date): string {
  const now = new Date()
  const then = date instanceof Date ? date : new Date(date)

  // 归一化到零点，按日历日计算差值
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(then.getFullYear(), then.getMonth(), then.getDate())

  const days = Math.round((today.getTime() - target.getTime()) / 86400000)
  if (days < 0) return '今天'
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 30) return `${days}天`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}个月`
  return `${Math.floor(months / 12)}年`
}
