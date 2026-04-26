import { getAllUsers } from '@/lib/db/queries'
import { loadMoreAuthors } from '@/lib/actions/post-actions'
import { AuthorListClient } from '@/components/blog/author-list-client'

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

  const { data: users, hasMore = false, error } = await getAllUsers(1, 20)

  if (error) {
    return <p className="text-destructive">加载失败: {error}</p>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">作者列表</h1>
      <AuthorListClient initialAuthors={users} initialHasMore={hasMore} onLoadMore={loadMoreAuthors} />
    </div>
  )
}
