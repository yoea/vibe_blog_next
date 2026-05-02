'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

export function AccessDeniedToast() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const handledRef = useRef<string | null>(null);
  const queryString = searchParams.toString();

  useEffect(() => {
    const params = new URLSearchParams(queryString);
    if (!params.has('access_denied')) return;

    const handledKey = `${pathname}?${queryString}`;
    if (handledRef.current === handledKey) return;
    handledRef.current = handledKey;

    params.delete('access_denied');
    const cleanQuery = params.toString();
    router.replace(`${pathname}${cleanQuery ? `?${cleanQuery}` : ''}`, {
      scroll: false,
    });

    setTimeout(() => {
      toast.error('无权访问该页面，已返回首页');
    }, 0);
  }, [pathname, queryString, router]);

  return null;
}
