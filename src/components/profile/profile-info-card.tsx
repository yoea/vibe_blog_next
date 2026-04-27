'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, Settings, Mail, Calendar, Edit3, Check, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AvatarUploader } from '@/components/settings/avatar-uploader'
import { updateUserSettings } from '@/lib/actions/settings-actions'
import { resetPasswordForEmail } from '@/lib/actions/auth-actions'
import { formatDaysAgo } from '@/lib/utils/time'
import { toast } from 'sonner'

interface Props {
  userId: string
  displayName: string
  avatarUrl: string | null
  email: string | null
  emailVerified: boolean
  createdAt: string | null
  isAdmin: boolean
}

export function ProfileInfoCard({ userId, displayName, avatarUrl, email, emailVerified, createdAt, isAdmin }: Props) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(displayName)
  const [saving, setSaving] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)
  const router = useRouter()

  const handleSaveName = async () => {
    if (name === displayName) {
      setEditing(false)
      return
    }
    setSaving(true)
    const res = await updateUserSettings(name)
    setSaving(false)
    if (res.error) {
      toast.error(res.error)
    } else {
      setEditing(false)
      toast.success('昵称已更新')
      router.refresh()
    }
  }

  const handleResetPassword = async () => {
    setResetting(true)
    const toastId = toast.loading('发送密码重置邮件中...')
    const res = await resetPasswordForEmail()
    setResetting(false)
    toast.dismiss(toastId)
    if (res.error) {
      toast.error(res.error)
    } else {
      setShowResetConfirm(false)
      toast.success('密码重置邮件已发送，请检查邮箱')
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-6">
        {/* Avatar section — centered on mobile */}
        <div className="shrink-0 flex justify-center sm:block">
          <AvatarUploader userId={userId} displayName={displayName} currentAvatarUrl={avatarUrl} />
        </div>

        {/* Info section */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Top row: display name + settings link */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Escape') { setName(displayName); setEditing(false) } }}
                    maxLength={8}
                    className="px-2 py-1 text-base font-medium rounded-md border bg-transparent focus:outline-none focus:ring-2 focus:ring-ring w-40"
                    autoFocus
                  />
                  <Button size="sm" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleSaveName} disabled={saving}>
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold">{displayName}</h2>
                  {isAdmin && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/40 rounded-full px-2.5 py-0.5">
                      <Shield className="h-3.5 w-3.5" />
                      管理员
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
                    title="编辑昵称"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
            <Link href="/settings" className="shrink-0">
              <Button variant="ghost" size="sm" className="text-xs gap-1">
                <Settings className="h-3.5 w-3.5" />
                设置
              </Button>
            </Link>
          </div>

          {/* Detail rows */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="font-mono text-xs">{email ?? '-'}</span>
              {emailVerified !== undefined && (
                emailVerified
                  ? <span className="text-xs text-green-600 shrink-0">✓ 已验证</span>
                  : <span className="text-xs text-orange-500 shrink-0">⚠ 未验证</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground">
                加入 {createdAt ? formatDaysAgo(createdAt) : '-'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-1">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowResetConfirm(true)}>
              <KeyRound className="h-3.5 w-3.5" />
              重置密码
            </Button>
            <p className="text-xs text-muted-foreground mt-1">重置方式将发送至注册邮箱</p>
          </div>
        </div>
      </div>

      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重置密码</DialogTitle>
            <DialogDescription>将向以下账户发送密码重置邮件，确认继续？</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 text-sm">
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="text-muted-foreground">昵称</span>
              <span className="font-medium">{displayName || email?.split('@')[0] || '-'}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <span className="text-muted-foreground">邮箱</span>
              <span className="font-mono text-xs">{email ?? '-'}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetConfirm(false)} disabled={resetting}>取消</Button>
            <Button onClick={handleResetPassword} disabled={resetting}>
              {resetting ? '发送中...' : '确认发送'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
