// 此文件由 scripts/generate-sitemap.mjs 自动生成，请勿手动编辑
// 运行 `node scripts/generate-sitemap.mjs` 重新生成

export interface SitemapRoute {
  path: string
  title: string
}

export const routes: SitemapRoute[] = [
  { path: '/', title: '首页' },
  { path: '/about', title: '关于本站' },
  { path: '/author', title: '作者列表' },
  { path: '/legal', title: '法律信息' },
  { path: '/login', title: '登录' },
  { path: '/maintenance', title: '系统维护' },
  { path: '/posts/new', title: '写新文章' },
  { path: '/privacy', title: '隐私政策' },
  { path: '/profile', title: '个人中心' },
  { path: '/register', title: '注册' },
  { path: '/settings', title: '设置' },
  { path: '/tags', title: '标签管理' },
]
