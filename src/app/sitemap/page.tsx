import Link from 'next/link';
import { DonateButton } from '@/components/donate-button';
import { routes } from './sitemap-data';
import {
  Home,
  Users,
  FileText,
  PenSquare,
  LogIn,
  UserPlus,
  Settings,
  Shield,
  Scale,
  Map,
  Heart,
  Tags,
  AlertTriangle,
  Archive,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const revalidate = 86400;

export const metadata = {
  title: '网站地图',
  openGraph: { title: '网站地图' },
  twitter: { card: 'summary_large_image', title: '网站地图' },
};

// 路由 → 图标映射（新增页面时只需在此添加一行）
const iconMap: Record<string, LucideIcon> = {
  '/': Home,
  '/author': Users,
  '/sitemap': Map,
  '/profile': FileText,
  '/posts/new': PenSquare,
  '/login': LogIn,
  '/register': UserPlus,
  '/settings': Settings,
  '/about': Heart,
  '/privacy': Shield,
  '/legal': Scale,
  '/tags': Tags,
  '/maintenance': AlertTriangle,
  '/admin/archive': Archive,
};

// 路由 → 分类映射
const categoryMap: Record<string, string> = {
  '/': '内容浏览',
  '/author': '内容浏览',
  '/sitemap': '内容浏览',
  '/tags': '内容浏览',
  '/profile': '文章管理',
  '/posts/new': '文章管理',
  '/login': '账号',
  '/register': '账号',
  '/settings': '账号',
  '/about': '关于',
  '/privacy': '关于',
  '/legal': '关于',
  '/maintenance': '系统',
  '/admin/archive': '系统',
};

// 按分类分组
const categoryOrder = [
  '内容浏览',
  '文章管理',
  '账号',
  '关于',
  '系统',
  '其他',
  '支持',
];

const grouped = routes.reduce<Record<string, typeof routes>>((acc, route) => {
  const cat = categoryMap[route.path] ?? '其他';
  if (!acc[cat]) acc[cat] = [];
  acc[cat].push(route);
  return acc;
}, {});

// 添加"支持"分类（非路由项）
const supportItems = [{ title: '给网站作者充电', icon: Heart }];

export default async function SitemapPage() {
  const sortedCategories = categoryOrder.filter(
    (category) => grouped[category] || category === '支持',
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">网站地图</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {sortedCategories.map((category) => (
          <section key={category} className="text-center sm:text-left">
            <h2 className="text-lg font-semibold mb-3 flex items-center justify-center sm:justify-start gap-2">
              {category}
            </h2>
            <ul className="space-y-2 sm:space-y-1">
              {category === '支持'
                ? supportItems.map((item) => (
                    <li key={item.title}>
                      <DonateButton>
                        <button className="inline-flex items-center gap-2 text-sm text-primary hover:underline py-1.5 sm:py-1">
                          <item.icon className="h-4 w-4 shrink-0" />
                          {item.title}
                        </button>
                      </DonateButton>
                    </li>
                  ))
                : grouped[category]?.map((route) => {
                    const Icon = iconMap[route.path] ?? FileText;
                    return (
                      <li key={route.path}>
                        <Link
                          href={route.path}
                          className="inline-flex items-center gap-2 text-sm text-primary hover:underline py-1.5 sm:py-1"
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          {route.title}
                        </Link>
                      </li>
                    );
                  })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
