// 此文件由 scripts/build/generate-sitemap.mjs 自动生成，请勿手动编辑
// 运行 `node scripts/build/generate-sitemap.mjs` 重新生成

export interface SitemapRoute {
  path: string;
  title: string;
}

export const routes: SitemapRoute[] = [
  { path: '/', title: '首页' },
  { path: '/about', title: '关于本站' },
  { path: '/author', title: '作者列表' },
  { path: '/legal', title: '法律信息' },
  { path: '/privacy', title: '隐私政策' },
  { path: '/sitemap', title: '网站地图' },
  { path: '/tags', title: '标签管理' },
];
