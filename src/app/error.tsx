'use client';

import { useEffect, useState } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [message, setMessage] = useState('服务器内部错误');

  useEffect(() => {
    const msg = error.message?.toLowerCase() || '';
    if (msg.includes('maintenance') || msg.includes('维护')) {
      setMessage('站点正在维护中，请稍后再试');
    } else if (
      msg.includes('deploy') ||
      msg.includes('部署') ||
      msg.includes('building')
    ) {
      setMessage('新版本正在部署中，页面暂时不可用');
    } else if (msg.includes('timeout') || msg.includes('超时')) {
      setMessage('请求超时，请检查网络后重试');
    } else if (msg.includes('database') || msg.includes('数据库')) {
      setMessage('数据库连接异常，请稍后再试');
    } else if (msg.includes('rate limit') || msg.includes('too many')) {
      setMessage('请求过于频繁，请稍后再试');
    }
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
      <h1 className="text-5xl font-bold text-muted-foreground">500</h1>
      <p className="text-foreground max-w-sm">{message}</p>
      <p className="text-xs text-muted-foreground">
        错误代码：{error.digest ?? '未知'}
      </p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
      >
        重试
      </button>
    </div>
  );
}
