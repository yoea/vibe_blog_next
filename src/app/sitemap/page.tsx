import type { Metadata } from 'next'
import Link from 'next/link'
import { DonateButton } from '@/components/donate-button'
import { Home, Users, FileText, PenSquare, LogIn, UserPlus, Settings, Shield, Scale, Map, Heart } from 'lucide-react'

export const metadata = {
  title: '网站地图',
}

const categories = [
  {
    title: '内容浏览',
    items: [
      { href: '/', title: '首页', icon: Home },
      { href: '/author', title: '作者列表', icon: Users },
      { href: '/sitemap', title: '网站地图', icon: Map },
    ],
  },
  {
    title: '文章管理',
    items: [
      { href: '/profile', title: '个人中心', icon: FileText },
      { href: '/posts/new', title: '新建文章', icon: PenSquare },
    ],
  },
  {
    title: '账号',
    items: [
      { href: '/login', title: '登录', icon: LogIn },
      { href: '/register', title: '注册', icon: UserPlus },
      { href: '/settings', title: '用户设置', icon: Settings },
    ],
  },
  {
    title: '关于',
    items: [
      { href: '/privacy', title: '隐私政策', icon: Shield },
      { href: '/legal', title: '法律信息', icon: Scale },
    ],
  },
  {
    title: '支持',
    items: [
      { href: null, title: '给网站作者充电', icon: Heart },
    ],
  },
]

export default async function SitemapPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">网站地图</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {categories.map((category) => (
          <section key={category.title}>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">{category.title}</h2>
            <ul className="space-y-1">
              {category.items.map((item) => {
                const Icon = item.icon
                if (item.title === '给网站作者充电') {
                  return (
                    <li key={item.title}>
                      <DonateButton>
                        <button className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline py-1">
                          <Icon className="h-4 w-4 shrink-0" />
                          {item.title}
                        </button>
                      </DonateButton>
                    </li>
                  )
                }
                return (
                  <li key={item.href}>
                    <Link href={item.href!} className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline py-1">
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.title}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}
