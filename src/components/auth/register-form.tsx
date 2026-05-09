'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Eye,
  EyeOff,
  ShieldCheck,
  Mail,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export function RegisterForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const strengthChecks = [
    { label: '至少 8 个字符', pass: password.length >= 8 },
    { label: '包含大写字母', pass: /[A-Z]/.test(password) },
    { label: '包含小写字母', pass: /[a-z]/.test(password) },
    { label: '包含数字', pass: /\d/.test(password) },
  ];
  const strength = strengthChecks.filter((c) => c.pass).length;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const pwd = formData.get('password') as string;
    const confirm = formData.get('confirmPassword') as string;

    if (pwd.length < 8) {
      setError('密码长度至少 8 个字符');
      setLoading(false);
      return;
    }
    if (pwd !== confirm) {
      setError('两次输入的密码不一致');
      setLoading(false);
      return;
    }

    const supabase = createClient();
    try {
      const { error: err } = await supabase.auth.signUp({
        email,
        password: pwd,
      });
      setLoading(false);

      if (err) {
        setError(err.message);
        toast.error(err.message);
      } else {
        setSuccess(true);
        toast.success('注册成功！请检查邮箱完成验证');
      }
    } catch (err) {
      setLoading(false);
      const message =
        err instanceof TypeError && err.message === 'Failed to fetch'
          ? '无法连接认证服务，请检查网络或稍后重试'
          : err instanceof Error
            ? err.message
            : '注册失败，请稍后重试';
      setError(message);
      toast.error(message);
    }
  }

  if (success) {
    return (
      <div className="space-y-6 max-w-sm">
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 space-y-3">
          <p className="font-semibold text-green-800 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            注册成功！
          </p>
          <p className="text-sm text-green-700">您现在可以直接登录。</p>
          <p className="text-sm text-green-700">
            如果无法登录，请检查邮箱完成验证后即可登录。
          </p>
          <p className="text-sm text-green-700">
            若未收到邮件，请联系网站管理员。
          </p>
          <Button
            variant="outline"
            onClick={() => (window.location.href = '/login')}
            className="mt-2"
            data-testid="register-go-login"
          >
            去登录
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-sm">
      <form
        onSubmit={handleSubmit}
        className="space-y-4"
        data-testid="register-form"
      >
        <div className="space-y-2">
          <Label htmlFor="email">邮箱</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            autoComplete="email"
            data-testid="register-email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">密码</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              data-testid="register-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? '隐藏密码' : '显示密码'}
              data-testid="register-password-toggle"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {password.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i <= strength
                        ? strength <= 1
                          ? 'bg-red-400'
                          : strength <= 2
                            ? 'bg-yellow-400'
                            : strength <= 3
                              ? 'bg-blue-400'
                              : 'bg-green-500'
                        : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              <ul className="space-y-0.5">
                {strengthChecks.map((check) => (
                  <li
                    key={check.label}
                    className={`text-xs flex items-center gap-1 ${check.pass ? 'text-green-600' : 'text-muted-foreground'}`}
                  >
                    <ShieldCheck
                      className={`h-3 w-3 ${check.pass ? 'text-green-500' : 'opacity-30'}`}
                    />
                    {check.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">确认密码</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              data-testid="register-confirm-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showConfirm ? '隐藏确认密码' : '显示确认密码'}
              data-testid="register-confirm-toggle"
            >
              {showConfirm ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {confirmPassword.length > 0 && password !== confirmPassword && (
            <p className="text-xs text-destructive">两次输入的密码不一致</p>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive" data-testid="register-error">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={
            loading || password.length < 8 || password !== confirmPassword
          }
          className="w-full"
          data-testid="register-submit"
        >
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {loading ? '注册中...' : '注册'}
        </Button>
      </form>

      <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-blue-900 flex items-center gap-1.5">
          <Mail className="h-4 w-4 text-blue-500" />
          注册说明
        </h3>
        <ul className="space-y-2 text-xs text-blue-800">
          <li className="flex items-start gap-2">
            <CheckCircle className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
            <span>使用邮箱和密码注册，系统将发送验证邮件到你的邮箱</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
            <span>收到邮件后点击链接完成验证，即可登录使用博客</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="h-3.5 w-3.5 text-blue-400 mt-0.5 shrink-0" />
            <span>密码长度至少 8 个字符，建议包含大小写字母和数字</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
