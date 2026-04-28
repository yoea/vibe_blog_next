'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { resetPasswordForEmail, deleteAccount } from '@/lib/actions/auth-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Sun, Moon, SunMoon, Heart } from 'lucide-react'
import { useTheme, type ThemeMode } from '@/components/layout/theme-provider'
import { DonateButton } from '@/components/donate-button'

interface Props {
  user: User
  isAdmin?: boolean
}

export function SettingsForm({ user, isAdmin }: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)
  const { mode, setMode } = useTheme()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.info('已退出登录')
    router.push('/')
  }

  const handleDeleteAccount = async () => {
    setDeletingAccount(true)
    const { error } = await deleteAccount()
    setDeletingAccount(false)
    if (error) {
      toast.error(error)
    } else {
      toast.success('账号已注销')
      router.push('/')
    }
  }

  const handleResetPassword = async () => {
    setResettingPassword(true)
    const toastId = toast.loading('发送密码重置邮件中...')
    const res = await resetPasswordForEmail()
    setResettingPassword(false)
    toast.dismiss(toastId)
    if (res.error) {
      toast.error(res.error)
    } else {
      setShowResetConfirm(false)
      toast.success('密码重置邮件已发送，请检查邮箱')
    }
  }

  const formatDate = (val: string | undefined) =>
    val ? new Date(val).toLocaleString('zh-CN') : '-'

  const displayName = user.email?.split('@')[0] ?? ''

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>账户操作</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
            <Button variant="outline" onClick={() => setShowResetConfirm(true)} className="w-full sm:w-auto">重置密码</Button>
            <p className="text-xs text-muted-foreground mt-1">重置方式将发送至注册邮箱，按指示重置密码。</p>
            </div>

            <div>
            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="w-full sm:w-auto">注销账号</Button>
            <p className="text-xs text-muted-foreground mt-1">注销后你的文章和评论将被保留，仅用户信息匿名化</p>
            </div>
              <Separator />
            <div>
            <Button variant="outline" onClick={handleLogout} className="w-full sm:w-auto">退出登录</Button>
            <p className="text-xs text-muted-foreground mt-1">退出登录后，你将返回主页</p>
            </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>支持</CardTitle>
        </CardHeader>
        <CardContent>
          <DonateButton>
            <Button variant="outline" className="w-full sm:w-auto">
              <Heart className="h-4 w-4 mr-1.5 text-red-500" />
              给网站作者充电
            </Button>
          </DonateButton>
          <p className="text-xs text-muted-foreground mt-2">如果这个网站对你有帮助，可以请作者喝杯咖啡</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>主题</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {(['light', 'dark', 'system'] as ThemeMode[]).map((value) => {
              const Icon = value === 'system' ? SunMoon : value === 'dark' ? Moon : Sun
              const label = value === 'system' ? '跟随系统' : value === 'dark' ? '深色' : '浅色'
              return (
                <button
                  key={value}
                  onClick={() => setMode(value)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    mode === value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>关于</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            <Link href="/about" className="hover:text-foreground transition-colors">
              查看站点信息及构建详情 →
            </Link>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>注销账号</DialogTitle>
            <DialogDescription>
              确定要注销账号吗？你的文章和评论将被保留，但用户信息将匿名化。此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={deletingAccount}>取消</Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deletingAccount}>
              {deletingAccount ? '注销中...' : '确认注销'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重置密码</DialogTitle>
            <DialogDescription>
              将向以下账户发送密码重置邮件，确认继续？
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 text-sm">
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="text-muted-foreground">昵称</span>
              <span className="font-medium">{displayName || '-'}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="text-muted-foreground">邮箱</span>
              <span className="font-mono text-xs">{user.email ?? '-'}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetConfirm(false)} disabled={resettingPassword}>取消</Button>
            <Button onClick={handleResetPassword} disabled={resettingPassword}>
              {resettingPassword ? '发送中...' : '确认发送'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
