'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

export function AccessDeniedToast() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has('access_denied')) return;

    url.searchParams.delete('access_denied');
    window.history.replaceState(
      null,
      '',
      `${url.pathname}${url.search}${url.hash}`,
    );
    toast.error('无权访问该页面，已返回首页');
  }, []);

  return null;
}
