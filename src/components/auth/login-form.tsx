'use client'

import { useFormStatus } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

export function LoginForm() {
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    })
    if (error) {
      setError(error.message)
      toast.error(error.message)
    } else {
      toast.success('登录成功')
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium">邮箱</label>
        <input id="email" name="email" type="email" placeholder="you@example.com" required
          className="w-full px-3 py-2 rounded-md border bg-transparent text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium">密码</label>
        <div className="relative">
          <input id="password" name="password" type={showPassword ? 'text' : 'password'} required minLength={6}
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
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending}
      className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer">
      {pending ? '登录中...' : '登录'}
    </button>
  )
}
