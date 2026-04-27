'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, Settings, Mail, Calendar, Edit3, Check } from 'lucide-react'
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
    <div className="rounded-lg border bg-card p-6 space-y-5">
      <AvatarUploader userId={userId} displayName={displayName} currentAvatarUrl={avatarUrl} />

      <div className="space-y-3 text-sm">
        {/* Display name */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-muted-foreground text-xs">昵称</span>
            {editing ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={8}
                  className="px-2 py-1 text-sm rounded-md border bg-transparent focus:outline-none focus:ring-2 focus:ring-ring w-40"
                  autoFocus
                />
                <Button size="sm" variant="ghost" className="h-7 w-7" onClick={handleSaveName} disabled={saving}>
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-medium">{displayName}</span>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-normal text-muted-foreground/60 border rounded px-1.5 py-0.5">
                    <Shield className="h-3 w-3" />
                    管理员
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Edit3 className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              <Settings className="h-3.5 w-3.5" />
              设置
            </Button>
          </Link>
        </div>

        {/* Email */}
        <div className="flex items-center gap-2 py-1">
          <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="font-mono text-xs">{email ?? '-'}</span>
          {emailVerified !== undefined && (
            emailVerified
              ? <span className="text-xs text-green-600 shrink-0">✓ 已验证</span>
              : <span className="text-xs text-orange-500 shrink-0">⚠ 未验证</span>
          )}
        </div>

        {/* Join date */}
        <div className="flex items-center gap-2 py-1">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground">
            加入 {createdAt ? formatDaysAgo(createdAt) : '-'}
          </span>
        </div>
      </div>

      <div>
        <Button variant="outline" size="sm" onClick={() => setShowResetConfirm(true)}>
          重置密码
        </Button>
        <p className="text-xs text-muted-foreground mt-1">重置方式将发送至注册邮箱</p>
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
