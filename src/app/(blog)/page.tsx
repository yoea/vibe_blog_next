import { PostList } from '@/components/blog/post-list'

export const revalidate = 300;

export default function HomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">全部文章</h1>
      <PostList />
    </div>
  )
}
