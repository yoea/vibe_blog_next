'use client'

import { useFormStatus } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(true)
  const redirectedRef = useRef(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && !redirectedRef.current) {
        redirectedRef.current = true
        toast.info('已登录，正在跳转')
        window.location.href = redirectTo || '/profile'
      } else {
        setChecking(false)
      }
    })
  }, [redirectTo])

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
      window.location.href = redirectTo || '/'
    }
  }

  if (checking) return null

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium">邮箱</label>
        <input id="email" name="email" type="email" placeholder="you@example.com" required autoComplete="email"
          className="w-full px-3 py-2 rounded-md border bg-transparent text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium">密码</label>
        <input id="password" name="password" type="password" required minLength={6} autoComplete="current-password"
          className="w-full px-3 py-2 rounded-md border bg-transparent text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
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
