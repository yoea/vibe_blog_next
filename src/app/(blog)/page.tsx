import { PostList } from '@/components/blog/post-list'
import { SiteHero } from '@/components/blog/site-hero'
import Link from 'next/link'
import { Tags, Users } from 'lucide-react'

export const revalidate = 300;

export const metadata = {
  title: '首页',
}

export default async function HomePage() {
  return (
    <div className="space-y-8">
      <SiteHero />
      <nav className="flex items-center justify-center gap-6 text-sm pb-4">
        <Link href="/tags" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <Tags className="h-4 w-4" />
          标签管理
        </Link>
        <Link href="/author" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <Users className="h-4 w-4" />
          作者列表
        </Link>
      </nav>
      <PostList />
    </div>
  )
}
