import Link from 'next/link';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata = {
  title: '注册',
  openGraph: { title: '注册' },
  twitter: { card: 'summary_large_image', title: '注册' },
};

export default function RegisterPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">注册</h1>
          <p className="text-sm text-muted-foreground">创建你的账号</p>
        </div>
        <RegisterForm />
        <p className="text-center text-sm text-muted-foreground">
          已有账号？{' '}
          <Link href="/login" className="text-primary hover:underline">
            立即登录
          </Link>
        </p>
      </div>
    </div>
  );
}
