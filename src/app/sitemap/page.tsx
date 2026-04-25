import { Metadata } from 'next'
import Link from 'next/link'
import { getPublishedPosts } from '@/lib/db/queries'

export const metadata: Metadata = {
  title: '网站地图 - 马克博客',
}

export default async function SitemapPage() {
  const { data: posts } = await getPublishedPosts(1, 100)

  const pages = [
    { href: '/', title: '首页' },
    { href: '/login', title: '登录' },
    { href: '/register', title: '注册' },
    { href: '/my-posts', title: '我的文章' },
    { href: '/posts/new', title: '新建文章' },
    { href: '/settings', title: '用户设置' },
    { href: '/privacy', title: '隐私政策' },
    { href: '/legal', title: '法律信息' },
    { href: '/sitemap', title: '网站地图' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">网站地图</h1>

      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-3">页面</h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            {pages.map((page) => (
              <li key={page.href}>
                <Link href={page.href} className="text-sm text-blue-600 hover:underline">
                  {page.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">文章</h2>
          {posts && posts.length > 0 ? (
            <ul className="space-y-1">
              {posts.map((post) => (
                <li key={post.id}>
                  <Link href={`/posts/${post.slug}`} className="text-sm text-blue-600 hover:underline">
                    {post.title}
                  </Link>
                  <span className="text-xs text-muted-foreground ml-2">
                    {new Date(post.created_at).toLocaleDateString('zh-CN')}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">暂无文章</p>
          )}
        </section>
      </div>
    </div>
  )
}
