import { Metadata } from 'next'
import Link from 'next/link'
import { SiteHero } from '@/components/blog/site-hero'

export const metadata = {
  title: '网站地图',
}

export default async function SitemapPage() {
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
    { href: '/author', title: '作者列表' },
  ]

  return (
    <div className="space-y-6">
      <SiteHero />

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
    </div>
  )
}
