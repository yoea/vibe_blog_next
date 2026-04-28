'use client'

import { useEffect, useState } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [message, setMessage] = useState('服务器内部错误')

  useEffect(() => {
    const msg = error.message?.toLowerCase() || ''
    if (msg.includes('maintenance') || msg.includes('维护')) {
      setMessage('站点正在维护中，请稍后再试')
    } else if (msg.includes('deploy') || msg.includes('部署') || msg.includes('building')) {
      setMessage('新版本正在部署中，页面暂时不可用')
    } else if (msg.includes('timeout') || msg.includes('超时')) {
      setMessage('请求超时，请检查网络后重试')
    } else if (msg.includes('database') || msg.includes('数据库')) {
      setMessage('数据库连接异常，请稍后再试')
    } else if (msg.includes('rate limit') || msg.includes('too many')) {
      setMessage('请求过于频繁，请稍后再试')
    }
  }, [error])

  return (
    <html>
      <body className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-4 px-4">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100">500</h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-sm">{message}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            错误代码：{error.digest ?? '未知'}
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重试
          </button>
        </div>
      </body>
    </html>
  )
}
