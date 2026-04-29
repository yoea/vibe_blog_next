'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, Settings, Mail, Calendar, Edit3, Check, Camera, Trash2, Unlink } from 'lucide-react'
import type { UserIdentity } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  isGitHubUser: boolean
  isGitHubConnected: boolean
  githubUsername: string | null
  githubIdentity: UserIdentity | null
}

export function ProfileInfoCard({ userId, displayName, avatarUrl, email, emailVerified, createdAt, isAdmin, isGitHubUser, isGitHubConnected, githubUsername, githubIdentity }: Props) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(displayName)
  const [saving, setSaving] = useState(false)
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const avatarRef = useRef<AvatarUploaderHandle>(null)
  const router = useRouter()

  // 检测 OAuth 回调结果（query 参数或 hash）
  useEffect(() => {
    const cookies = document.cookie.split(';')
    const hasLinkCookie = cookies.some(c => c.trim().startsWith('linking_user_id='))

    // Supabase linkIdentity 错误可能在 query 或 hash 中
    const searchParams = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    const errorCode = searchParams.get('error_code') || hashParams.get('error_code')
    const errorDesc = searchParams.get('error_description') || hashParams.get('error_description')

    if (errorCode || errorDesc) {
      if (errorCode === 'identity_already_exists') {
        toast.error(
          '绑定失败：该 GitHub 账号已绑定到另一个用户。请先登录原账号解除绑定，或使用其他 GitHub 账号。',
          { duration: 10000 }
        )
      } else if (errorDesc) {
        toast.error(decodeURIComponent(errorDesc.replace(/\+/g, ' ')), { duration: 8000 })
      }
      // 清除 URL 中的错误参数
      history.replaceState(null, '', window.location.pathname)
    } else if (hasLinkCookie) {
      // 无错误 + 有 linking_user_id cookie → 绑定成功
      document.cookie = 'linking_user_id=; max-age=0; path=/'
      toast.success('GitHub 账号绑定成功')
    }
  }, [])

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

  const handleUnlinkGitHub = async () => {
    if (!githubIdentity) return
    setUnlinking(true)
    const supabase = createClient()
    const { error } = await supabase.auth.unlinkIdentity(githubIdentity)
    setUnlinking(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('已解除 GitHub 绑定')
      setShowUnlinkConfirm(false)
      router.refresh()
    }
  }

  const handleLinkGitHub = async () => {
    // 记录当前用户 ID，回调时检测是否被切换到其他账号
    document.cookie = `linking_user_id=${userId}; max-age=300; path=/`
    const supabase = createClient()
    const { error } = await supabase.auth.linkIdentity({
      provider: 'github',
      // 直接重定向到 profile，不经过 callback route，保留 hash 中的错误信息
      options: { redirectTo: `${window.location.origin}/profile` },
    })
    if (error) toast.error(error.message)
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
            {/* GitHub 绑定状态（仅 GitHub 登录用户显示） */}
            {isGitHubUser && (
              <div className="flex items-center gap-2">
                <GitHubIcon className="h-4 w-4 shrink-0" />
                <span className="inline-flex items-center gap-1.5 text-xs">
                  <a
                    href={`https://github.com/${githubUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground hover:underline"
                  >
                    {githubUsername ?? 'GitHub'}
                  </a>
                  <button
                    type="button"
                    onClick={() => setShowUnlinkConfirm(true)}
                    className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                    title="解除绑定"
                  >
                    <Unlink className="h-3 w-3" />
                  </button>
                </span>
              </div>
            )}
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
      </div>

      {/* 解除绑定确认弹窗 */}
      <Dialog open={showUnlinkConfirm} onOpenChange={setShowUnlinkConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>解除 GitHub 绑定</DialogTitle>
            <DialogDescription>
              确定要解除 GitHub 账号绑定吗？解除后可通过重新绑定恢复关联。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnlinkConfirm(false)} disabled={unlinking}>取消</Button>
            <Button variant="destructive" onClick={handleUnlinkGitHub} disabled={unlinking}>
              {unlinking ? '解除中...' : '确认解除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
