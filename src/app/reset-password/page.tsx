'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Mail } from 'lucide-react'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validLink, setValidLink] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      setValidLink(!!session)
    }
    checkSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validLink) {
      toast.error('无效的密码重置链接，请重新申请')
      return
    }
    if (password !== confirmPassword) {
      toast.error('两次输入的密码不一致')
      return
    }
    if (password.length < 8) {
      toast.error('密码长度至少 8 个字符')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('密码已重置')
      router.push('/')
    }
  }

  if (validLink === null) {
    return null
  }

  if (!validLink) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">重置密码</h1>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2 max-w-sm">
          <p className="font-semibold flex items-center gap-1.5">
            <Mail className="h-4 w-4 text-amber-500" />
            链接无效
          </p>
          <p className="text-sm text-amber-800">
            该密码重置链接已过期或无效。请在设置页面重新申请重置密码。
          </p>
          <Button variant="outline" onClick={() => router.push('/')} className="mt-2">返回首页</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">重置密码</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium">新密码</label>
          <div className="relative">
            <input id="password" type={showPassword ? 'text' : 'password'}
              value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength={8}
              className="w-full px-3 pr-10 py-2 rounded-md border bg-transparent text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <label htmlFor="confirm" className="block text-sm font-medium">确认密码</label>
          <div className="relative">
            <input id="confirm" type={showConfirm ? 'text' : 'password'}
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              required minLength={8}
              className="w-full px-3 pr-10 py-2 rounded-md border bg-transparent text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? '保存中...' : '保存新密码'}
        </Button>
      </form>
    </div>
  )
}
