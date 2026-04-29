'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, Settings, Mail, Calendar, Edit3, Check, Camera, Trash2, LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { AvatarUploader } from '@/components/settings/avatar-uploader'
import type { AvatarUploaderHandle } from '@/components/settings/avatar-uploader'
import { updateUserSettings } from '@/lib/actions/settings-actions'
import { formatDaysAgo } from '@/lib/utils/time'
import { toast } from 'sonner'
import { GitHubIcon } from '@/components/icons/github-icon'

interface Props {
  userId: string
  displayName: string
  avatarUrl: string | null
  email: string | null
  emailVerified: boolean
  createdAt: string | null
  isAdmin: boolean
  isGitHubConnected: boolean
}

export function ProfileInfoCard({ userId, displayName, avatarUrl, email, emailVerified, createdAt, isAdmin, isGitHubConnected }: Props) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(displayName)
  const [saving, setSaving] = useState(false)
  const avatarRef = useRef<AvatarUploaderHandle>(null)
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

  return (
    <div className="rounded-lg border bg-card p-4 sm:p-6">
      {/* Mobile: vertical stack | Desktop: 2-column grid */}
      <div className="sm:grid sm:grid-cols-[auto_1fr] sm:gap-x-6 sm:gap-y-4">
        {/* Row 1, Col 1: Avatar */}
        <div className="flex justify-center sm:block">
          <AvatarUploader
            ref={avatarRef}
            userId={userId}
            displayName={displayName}
            currentAvatarUrl={avatarUrl}
            size="2xl"
            actionsClassName="sm:hidden"
          />
        </div>

        {/* Row 1, Col 2: Info */}
        <div className="min-w-0 space-y-3 mt-6 sm:mt-0">
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
        </div>

        {/* Row 2, Col 1: Avatar buttons + hint (desktop only) */}
        <div className="hidden sm:flex flex-col items-center gap-1.5">
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => avatarRef.current?.openFilePicker()}>
              <Camera className="h-3.5 w-3.5 mr-1.5" />
              更换头像
            </Button>
            {avatarUrl && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => avatarRef.current?.openDeleteConfirm()}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                删除
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center">支持 JPG、PNG，最大 20MB</p>
        </div>

        {/* Row 2, Col 2: GitHub status */}
        <div className="mt-4 sm:mt-0 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <GitHubIcon className="h-4 w-4" />
            {isGitHubConnected ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">
                <Check className="h-3.5 w-3.5" />
                已绑定 GitHub
              </span>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  const supabase = createClient()
                  const { error } = await supabase.auth.linkIdentity({
                    provider: 'github',
                    options: { redirectTo: `${window.location.origin}/api/auth/callback?redirect_to=/profile` },
                  })
                  if (error) toast.error(error.message)
                }}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <LinkIcon className="h-3 w-3" />
                绑定 GitHub
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
