'use client';

import { useFormStatus } from 'react-dom';
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { onAuthChange } from '@/lib/actions/auth-actions';
import { GitHubIcon } from '@/components/icons/github-icon';

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);
  const redirectedRef = useRef(false);

  useEffect(() => {
    // 进入登录页时清除标记，确保本次登录能弹出 toast
    sessionStorage.removeItem('login_toast_shown');

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && !redirectedRef.current) {
        redirectedRef.current = true;
        window.location.href = redirectTo || '/profile';
      } else {
        setChecking(false);
      }
    });
  }, [redirectTo]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const formData = new FormData(e.currentTarget);
    const supabase = createClient();
    let loggedIn = false;
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.get('email') as string,
        password: formData.get('password') as string,
      });
      if (error) {
        const message =
          error.message === 'Invalid login credentials'
            ? '用户名或密码错误'
            : error.message;
        setError(message);
        toast.error(message);
      } else {
        loggedIn = true;
        try {
          await onAuthChange();
        } catch {
          // onAuthChange 失败不影响登录流程，继续导航
        }
        window.location.href = redirectTo || '/';
      }
    } catch (err) {
      if (loggedIn) {
        window.location.href = redirectTo || '/';
        return;
      }
      const message =
        err instanceof TypeError && err.message === 'Failed to fetch'
          ? '无法连接认证服务，请检查网络或稍后重试'
          : err instanceof Error
            ? err.message
            : '登录失败，请稍后重试';
      setError(message);
      toast.error(message);
    }
  }

  if (checking) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium">
          邮箱
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          autoComplete="email"
          className="w-full px-3 py-2 rounded-md border bg-transparent text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium">
          密码
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="current-password"
          className="w-full px-3 py-2 rounded-md border bg-transparent text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <SubmitButton />

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">或</span>
        </div>
      </div>

      <button
        type="button"
        onClick={async () => {
          const supabase = createClient();
          try {
            const siteUrl = window.location.origin;
            const callbackUrl = `${siteUrl}/api/auth/callback`;
            const { error } = await supabase.auth.signInWithOAuth({
              provider: 'github',
              options: {
                redirectTo: redirectTo
                  ? `${callbackUrl}?redirect_to=${encodeURIComponent(redirectTo)}`
                  : callbackUrl,
              },
            });
            if (error) {
              toast.error(error.message);
            }
          } catch (err) {
            const message =
              err instanceof TypeError && err.message === 'Failed to fetch'
                ? '无法连接认证服务，请检查网络或稍后重试'
                : err instanceof Error
                  ? err.message
                  : 'GitHub 登录失败，请稍后重试';
            toast.error(message);
          }
        }}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#24292f] text-white rounded-md text-sm font-medium hover:bg-[#24292f]/90 transition-colors cursor-pointer"
      >
        <GitHubIcon className="h-4 w-4" />
        使用 GitHub 登录
      </button>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
    >
      {pending ? '登录中...' : '登录'}
    </button>
  );
}
