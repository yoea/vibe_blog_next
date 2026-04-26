import { getAllUsers } from '@/lib/db/queries'
import Link from 'next/link'
import { formatDaysAgo } from '@/lib/utils/time'
import { getUserColor } from '@/lib/utils/colors'

export const metadata = {
  title: '作者列表',
}

export default async function AuthorListPage() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">作者列表</h1>
        <p className="text-muted-foreground">管理员功能暂未开放。</p>
      </div>
    )
  }

  const { data: users, error } = await getAllUsers()

  if (error) {
    return <p className="text-destructive">加载失败: {error}</p>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">作者列表</h1>
      <p className="text-sm text-muted-foreground">{users.length} 位注册用户</p>

      <div className="grid gap-3">
        {users.map((user) => {
          const days = formatDaysAgo(user.createdAt)

          return (
            <Link
              key={user.id}
              href={`/author/${user.id}`}
              className="block rounded-lg border bg-card p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <span
                      className="font-semibold text-base"
                      style={{ color: getUserColor(user.id) }}
                    >
                      {user.displayName}
                    </span>
                    <div className="text-[10px] text-muted-foreground leading-tight">{user.id.slice(0, 8)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>文章{user.postCount}篇</span>
                  <span>注册 {days}</span>
                  <span
                    className={`inline-flex items-center gap-1 ${
                      user.isDeleted ? 'text-gray-400' : user.isActive ? 'text-green-600' : 'text-muted-foreground'
                    }`}
                  >
                    <span className={`inline-block h-2 w-2 rounded-full ${user.isDeleted ? 'bg-gray-300' : user.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {user.isDeleted ? '注销' : user.isActive ? '活跃' : '不活跃'}
                  </span>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
