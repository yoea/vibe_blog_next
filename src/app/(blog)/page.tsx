import { PostList } from '@/components/blog/post-list'
import { SiteHero } from '@/components/blog/site-hero'

export const revalidate = 300;

export const metadata = {
  title: '首页',
}

export default async function HomePage() {
  return (
    <div className="space-y-8">
      <SiteHero />
      <PostList />
    </div>
  )
}
