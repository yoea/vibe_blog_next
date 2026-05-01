'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import nprogress from 'nprogress';
import { useEffect } from 'react';

export function ProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    nprogress.done();
  }, [pathname, searchParams]);

  useEffect(() => {
    nprogress.configure({ showSpinner: false });

    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (!anchor) return;
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const href = anchor.getAttribute('href');
      if (
        !href ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:')
      )
        return;
      if (!href.startsWith('/') && !href.startsWith(window.location.origin))
        return;
      // 如果目标路由就是当前路由，不启动进度条（避免卡死）
      if (
        anchor.pathname + anchor.search ===
        window.location.pathname + window.location.search
      )
        return;
      nprogress.start();
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return null;
}
