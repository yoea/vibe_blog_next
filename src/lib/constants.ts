import type { BreadcrumbItem } from '@/components/layout/breadcrumb';

// linkRef 常量 — 用于文章页面包屑回退导航
export const LINK_REF_PROFILE = 'profile' as const;
export const LINK_REF_TAG_PREFIX = 'tag:' as const;
export const LINK_REF_AUTHOR_PREFIX = 'author:' as const;

export type LinkRefKind =
  | typeof LINK_REF_PROFILE
  | `tag:${string}`
  | `author:${string}`;

export const linkRefTag = (name: string) => `tag:${name}` as const;
export const linkRefAuthor = (name: string) => `author:${name}` as const;

/** 根据 ref 参数构建面包屑项目列表（不含最后一项文章标题） */
export function buildRefBreadcrumb(ref?: string): BreadcrumbItem[] {
  if (ref === LINK_REF_PROFILE) {
    return [{ label: '个人中心', href: '/profile' }];
  }
  if (ref?.startsWith(LINK_REF_TAG_PREFIX)) {
    const tagName = ref.slice(LINK_REF_TAG_PREFIX.length);
    return [
      { label: '标签', href: '/tags' },
      { label: tagName, href: `/tags/${encodeURIComponent(tagName)}` },
    ];
  }
  if (ref?.startsWith(LINK_REF_AUTHOR_PREFIX)) {
    const authorName = ref.slice(LINK_REF_AUTHOR_PREFIX.length);
    return [
      { label: '作者列表', href: '/author' },
      { label: decodeURIComponent(authorName) },
    ];
  }
  return [];
}
