'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export function LoginToast() {
  useEffect(() => {
    const supabase = createClient();

    // 监听 auth 状态变化（仅用于清理 cookie）
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        if (document.cookie.includes('skip_login_toast=')) {
          document.cookie = 'skip_login_toast=; max-age=0; path=/';
        }
        if (document.cookie.includes('login_success=')) {
          document.cookie = 'login_success=; max-age=0; path=/';
        }
      }
    });

    // 页面加载时的一次性检查
    const cookies = document.cookie.split(';');
    const getCookie = (name: string) =>
      cookies.find((c) => c.trim().startsWith(`${name}=`));

    if (getCookie('link_error')) {
      document.cookie = 'link_error=; max-age=0; path=/';
      toast.error('该 GitHub 账号已被其他账号绑定，无法关联');
    }

    if (getCookie('login_success')) {
      document.cookie = 'login_success=; max-age=0; path=/';
    }

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
