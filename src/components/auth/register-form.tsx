'use client'

import { useFormStatus } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mail, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

export function RegisterForm() {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    const formData = new FormData(e.currentTarget)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    })
    if (error) {
      setError(error.message)
      toast.error(error.message)
    } else {
      setSuccess(true)
      toast.success('注册成功！请检查邮箱完成验证')
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-sm space-y-4 p-6 border rounded-lg bg-green-50 text-green-800">
        <p className="font-semibold">注册成功！请检查邮箱完成验证。</p>
        <p className="text-sm">如果未收到邮件，请在 Supabase Dashboard 中关闭 "Confirm email"。</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium">邮箱</label>
          <input id="email" name="email" type="email" placeholder="you@example.com" required
            className="w-full px-3 py-2 rounded-md border bg-transparent text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium">密码</label>
          <div className="relative">
            <input id="password" name="password" type={showPassword ? 'text' : 'password'} required minLength={8}
              className="w-full px-3 pr-10 py-2 rounded-md border bg-transparent text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <SubmitButton />
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
            <span>密码长度至少 6 个字符</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending}
      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer">
      {pending ? '注册中...' : '注册'}
    </button>
  )
}
