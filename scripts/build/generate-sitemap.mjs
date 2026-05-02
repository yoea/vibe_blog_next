#!/usr/bin/env node
// 自动扫描 src/app 下的 page.tsx，生成 sitemap 路由数据
// 用法: node scripts/build/generate-sitemap.mjs

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_DIR = join(__dirname, '..', '..', 'src', 'app');
const OUTPUT = join(
  __dirname,
  '..',
  '..',
  'src',
  'app',
  'sitemap',
  'sitemap-data.ts',
);

const EXCLUDED_ROUTE_PREFIXES = [
  '/admin',
  '/login',
  '/maintenance',
  '/posts-edit',
  '/posts/new',
  '/profile',
  '/register',
  '/settings',
];

function isPublicRoute(routePath) {
  return !EXCLUDED_ROUTE_PREFIXES.some(
    (prefix) => routePath === prefix || routePath.startsWith(`${prefix}/`),
  );
}

// 扫描所有 page.tsx 文件，生成路由路径
function scanRoutes(dir, basePath = '') {
  const routes = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      // 跳过路由组 (auth) (blog) 不影响 URL
      if (entry.name.startsWith('(') && entry.name.endsWith(')')) {
        routes.push(...scanRoutes(fullPath, basePath));
        continue;
      }
      // 跳过动态路由 [slug] [authorId]
      if (entry.name.startsWith('[')) continue;
      // 跳过 API 路由
      if (entry.name === 'api') continue;
      routes.push(...scanRoutes(fullPath, `${basePath}/${entry.name}`));
    } else if (entry.name === 'page.tsx') {
      const routePath = basePath || '/';
      if (!isPublicRoute(routePath)) continue;
      // 从文件中提取 metadata title
      const title = extractTitle(fullPath);
      routes.push({ path: routePath, title });
    }
  }

  return routes;
}

// 从 page.tsx 中提取页面标题
function extractTitle(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    // 1. 匹配 export const metadata = { title: '...' }
    const match = content.match(
      /export\s+const\s+metadata[^}]*?title:\s*['"](.+?)['"]/s,
    );
    if (match) return match[1];
    // 2. 匹配 title: '...' (generateMetadata 等)
    const genMatch = content.match(/title:\s*['"](.+?)['"]/);
    if (genMatch) return genMatch[1];
    // 3. 匹配 <h1>...</h1> 中的文本
    const h1Match = content.match(/<h1[^>]*>([^<]+)<\/h1>/);
    if (h1Match) return h1Match[1].trim();
    // 4. 匹配模板字符串中的 <h1>{`...`}</h1> 或 <h1>{'...'}</h1>
    const h1ExprMatch = content.match(/<h1[^>]*>\{[`'"](.+?)[`'"]\}<\/h1>/);
    if (h1ExprMatch) return h1ExprMatch[1].trim();
  } catch {}
  return null;
}

const routes = scanRoutes(APP_DIR).sort((a, b) => a.path.localeCompare(b.path));

// 生成文件内容
const lines = [
  '// 此文件由 scripts/build/generate-sitemap.mjs 自动生成，请勿手动编辑',
  '// 运行 `node scripts/build/generate-sitemap.mjs` 重新生成',
  '',
  'export interface SitemapRoute {',
  '  path: string;',
  '  title: string;',
  '}',
  '',
  `export const routes: SitemapRoute[] = [`,
];

// 从路径派生默认标题
function deriveTitle(path) {
  if (path === '/') return '首页';
  const segment = path.split('/').pop() ?? path;
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

for (const r of routes) {
  const title = r.title ?? deriveTitle(r.path);
  lines.push(
    `  { path: '${r.path}', title: '${title.replace(/'/g, "\\'")}' },`,
  );
}

lines.push('];');
lines.push('');

writeFileSync(OUTPUT, lines.join('\n'), 'utf-8');
console.log(
  `✓ 已生成 sitemap 路由数据: ${routes.length} 条路由 → ${relative(process.cwd(), OUTPUT)}`,
);
