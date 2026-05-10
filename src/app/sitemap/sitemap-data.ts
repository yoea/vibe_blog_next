// 此文件由 scripts/build/generate-sitemap.mjs 自动生成，请勿手动编辑
// 运行 `node scripts/build/generate-sitemap.mjs` 重新生成

export interface SitemapRoute {
  path: string;
  title: string;
  indexable?: boolean;
}

export const routes: SitemapRoute[] = [
  { path: '/', title: '首页' },
  { path: '/about', title: '关于本站' },
  { path: '/admin/archive', title: '归档管理', indexable: false },
  { path: '/author', title: '作者列表' },
  { path: '/guide', title: '接入指南' },
  { path: '/legal', title: '法律信息' },
  { path: '/login', title: '登录', indexable: false },
  { path: '/maintenance', title: '系统维护', indexable: false },
  { path: '/posts/new', title: '写新文章', indexable: false },
  { path: '/privacy', title: '隐私政策' },
  { path: '/profile', title: '个人中心', indexable: false },
  { path: '/register', title: '注册', indexable: false },
  { path: '/settings', title: '设置', indexable: false },
  { path: '/sitemap', title: '网站地图' },
  { path: '/tags', title: '标签管理' },
];
