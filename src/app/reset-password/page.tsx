'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [validLink, setValidLink] = useState<boolean | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      // 检查 callback 设置的 recovery_session cookie
      const hasRecoveryCookie = document.cookie.includes('recovery_session=')
      // 检查 code 交换失败的标记
      const hasErrorCookie = document.cookie.includes('recovery_error=')
      if (hasErrorCookie) {
        document.cookie = 'recovery_error=; max-age=0; path=/'
        setValidLink(false)
        return
      }
      if (!hasRecoveryCookie) {
        setValidLink(false)
        return
      }
      // 清除标记 cookie
      document.cookie = 'recovery_session=; max-age=0; path=/'
      // 验证 session 是否有效
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.email) {
        setValidLink(false)
        return
      }
      setValidLink(true)
      setUserEmail(session.user.email)
    }
    checkSession()
  }, [])

  // 密码强度检查
  const strengthChecks = [
    { label: '至少 8 个字符', pass: password.length >= 8 },
    { label: '包含大写字母', pass: /[A-Z]/.test(password) },
    { label: '包含小写字母', pass: /[a-z]/.test(password) },
    { label: '包含数字', pass: /\d/.test(password) },
  ]
  const strength = strengthChecks.filter((c) => c.pass).length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validLink) {
      toast.error('无效的密码重置链接，请重新申请')
      return
    }
    if (password.length < 8) {
      toast.error('密码长度至少 8 个字符')
      return
    }
    if (password !== confirmPassword) {
      toast.error('两次输入的密码不一致')
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
      // Force sign out and redirect to login
      await supabase.auth.signOut()
      router.push('/login')
    }
  }

  // 验证中
  if (validLink === null) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // 链接无效
  if (!validLink) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">重置密码</h1>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2 max-w-sm">
          <p className="font-semibold flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            抱歉，该重置密码链接无效或已过期
          </p>
          <p className="text-sm text-amber-800">
            邮件内的重置密码链接只能使用一次，请重新申请重置密码，或直接登录账号。
          </p>
          <div className="flex gap-2 mt-3">
            <Button variant="outline" onClick={() => router.push('/login')}>立即登录</Button>
            <Button variant="outline" onClick={() => router.push('/settings')}>重新申请</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-sm">
      <div>
        <h1 className="text-3xl font-bold">重置密码</h1>
        <p className="text-muted-foreground mt-1">账号：{userEmail}</p>
        <p className="text-muted-foreground text-sm">请输入你的新密码</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">新密码</Label>
          <div className="relative">
            <Input id="password" type={showPassword ? 'text' : 'password'}
              value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength={8} autoComplete="new-password" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {/* 密码强度指示器 */}
          {password.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                    i <= strength ? (
                      strength <= 1 ? 'bg-red-400' : strength <= 2 ? 'bg-yellow-400' : strength <= 3 ? 'bg-blue-400' : 'bg-green-500'
                    ) : 'bg-muted'
                  }`} />
                ))}
              </div>
              <ul className="space-y-0.5">
                {strengthChecks.map((check) => (
                  <li key={check.label} className={`text-xs flex items-center gap-1 ${check.pass ? 'text-green-600' : 'text-muted-foreground'}`}>
                    <ShieldCheck className={`h-3 w-3 ${check.pass ? 'text-green-500' : 'opacity-30'}`} />
                    {check.label}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">确认密码</Label>
          <div className="relative">
            <Input id="confirm" type={showConfirm ? 'text' : 'password'}
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              required minLength={8} autoComplete="new-password" />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {confirmPassword.length > 0 && password !== confirmPassword && (
            <p className="text-xs text-destructive">两次输入的密码不一致</p>
          )}
        </div>

        <Button type="submit" disabled={loading || password.length < 8 || password !== confirmPassword}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {loading ? '保存中...' : '保存新密码'}
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        想起来了？<Link href="/login" className="text-primary hover:underline">去登录</Link>
      </p>
    </div>
  )
}
