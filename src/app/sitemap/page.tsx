import Link from 'next/link'
import { DonateButton } from '@/components/donate-button'
import { categories } from './sitemap-data'

export const metadata = {
  title: '网站地图',
}

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
