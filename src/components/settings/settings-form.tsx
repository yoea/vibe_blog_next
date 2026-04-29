'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { deleteAccount } from '@/lib/actions/auth-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Sun, Moon, SunMoon, Heart, Wrench, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react'
import { useTheme, type ThemeMode } from '@/components/layout/theme-provider'
import { DonateButton } from '@/components/donate-button'
import { toggleMaintenanceMode, updateAIConfig, updateICPConfig } from '@/lib/actions/admin-actions'

interface Props {
  user: User
  isAdmin?: boolean
  maintenanceMode?: boolean
  aiBaseUrl?: string
  aiApiKey?: string
  aiModel?: string
  icpNumber?: string
  icpVisible?: boolean
}

export function SettingsForm({ user, isAdmin, maintenanceMode, aiBaseUrl: initialAiBaseUrl, aiApiKey: initialAiApiKey, aiModel: initialAiModel, icpNumber: initialIcpNumber, icpVisible: initialIcpVisible }: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [maintenanceLoading, setMaintenanceLoading] = useState(false)
  const [aiSaving, setAiSaving] = useState(false)
  const [aiBaseUrl, setAiBaseUrl] = useState(initialAiBaseUrl ?? '')
  const [aiApiKey, setAiApiKey] = useState(initialAiApiKey ?? '')
  const [aiModel, setAiModel] = useState(initialAiModel ?? '')
  const [showAiKey, setShowAiKey] = useState(false)
  const [icpNumber, setIcpNumber] = useState(initialIcpNumber ?? '')
  const [icpVisible, setIcpVisible] = useState(initialIcpVisible ?? false)
  const [icpSaving, setIcpSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [stickyHeader, setStickyHeader] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('header_sticky') === 'true'
  )
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

  const handleMaintenanceToggle = async () => {
    setMaintenanceLoading(true)
    const { error } = await toggleMaintenanceMode()
    setMaintenanceLoading(false)
    if (error) {
      toast.error(error)
    } else {
      toast.success(maintenanceMode ? '维护模式已关闭' : '维护模式已开启')
      router.refresh()
    }
  }

  const handleSaveAIConfig = async () => {
    setAiSaving(true)
    const { error } = await updateAIConfig(aiBaseUrl, aiApiKey, aiModel)
    setAiSaving(false)
    if (error) {
      toast.error(error)
    } else {
      toast.success('AI 配置已保存')
      router.refresh()
    }
  }

  const handleSaveICP = async () => {
    setIcpSaving(true)
    const { error } = await updateICPConfig(icpNumber, icpVisible)
    setIcpSaving(false)
    if (error) {
      toast.error(error)
    } else {
      toast.success('备案信息已保存')
      router.refresh()
    }
  }

  // 密码强度检查
  const strengthChecks = [
    { label: '至少 8 个字符', pass: newPassword.length >= 8 },
    { label: '包含大写字母', pass: /[A-Z]/.test(newPassword) },
    { label: '包含小写字母', pass: /[a-z]/.test(newPassword) },
    { label: '包含数字', pass: /\d/.test(newPassword) },
  ]
  const strength = strengthChecks.filter((c) => c.pass).length

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast.error('新密码长度至少 8 个字符')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的密码不一致')
      return
    }
    if (newPassword === currentPassword) {
      toast.error('新密码不能与当前密码相同')
      return
    }

    setChangingPassword(true)
    const supabase = createClient()

    // 用当前密码重新验证身份
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    })
    if (signInError) {
      setChangingPassword(false)
      toast.error('当前密码不正确')
      return
    }

    // 标记：跳过 LoginToast 的 SIGNED_IN 监听（避免弹出"登录成功"）
    document.cookie = 'skip_login_toast=1; max-age=10; path=/'
    // 验证通过，更新密码
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    setChangingPassword(false)

    if (updateError) {
      toast.error(updateError.message)
    } else {
      toast.success('密码修改成功')
      setShowChangePassword(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  const resetPasswordDialog = () => {
    setShowChangePassword(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  const formatDate = (val: string | undefined) =>
    val ? new Date(val).toLocaleString('zh-CN') : '-'

  const displayName = user.email?.split('@')[0] ?? ''
  const isPasswordUser = user.app_metadata?.provider === 'email' || (user.identities?.some(i => i.provider === 'email') ?? false)

  return (
    <div className="space-y-6">
      {/* 个性化 */}
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
          <Separator className="my-4" />
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">固定导航栏</h4>
              <p className="text-xs text-muted-foreground mt-0.5">滚动页面时导航栏始终显示在顶部</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={stickyHeader}
                onChange={(e) => {
                  const checked = e.target.checked
                  setStickyHeader(checked)
                  localStorage.setItem('header_sticky', String(checked))
                  window.dispatchEvent(new Event('header-sticky-changed'))
                }}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-xs text-muted-foreground">{stickyHeader ? '已开启' : '已关闭'}</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* 账户安全 */}
      {isPasswordUser && (
        <Card>
          <CardHeader>
            <CardTitle>账户安全</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setShowChangePassword(true)} className="w-full sm:w-auto">修改密码</Button>
            <p className="text-xs text-muted-foreground mt-1">验证当前密码后设置新密码。</p>
          </CardContent>
        </Card>
      )}

      {/* 支持 */}
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

      {/* 站点管理 (admin only) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>站点管理</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 维护模式 */}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h4 className="text-sm font-medium">维护模式</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {maintenanceMode
                    ? '已开启，访客将看到维护页面'
                    : '开启后访客将看到维护页面，管理员可正常访问'}
                </p>
              </div>
              <Button variant={maintenanceMode ? 'destructive' : 'outline'} size="sm" onClick={handleMaintenanceToggle} disabled={maintenanceLoading} className="shrink-0">
                <Wrench className="h-3.5 w-3.5 mr-1.5" />
                {maintenanceLoading ? '处理中...' : maintenanceMode ? '关闭' : '开启'}
              </Button>
            </div>

            <Separator />

            {/* ICP 备案 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">ICP 备案</h4>
                <label className="flex items-center gap-2 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={icpVisible}
                    onChange={async (e) => {
                      const checked = e.target.checked
                      setIcpVisible(checked)
                      const { error } = await updateICPConfig(icpNumber, checked)
                      if (error) {
                        setIcpVisible(!checked)
                        toast.error(error)
                      } else {
                        toast.success(checked ? '备案号已显示' : '备案号已隐藏')
                        router.refresh()
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-xs text-muted-foreground">页脚显示</span>
                </label>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="icp-number">备案号</Label>
                  <Input id="icp-number" value={icpNumber} onChange={(e) => setIcpNumber(e.target.value)} placeholder="浙ICP备XXXXXXXX号-X" />
                </div>
                <Button variant="outline" size="sm" onClick={handleSaveICP} disabled={icpSaving} className="shrink-0 mb-px">
                  {icpSaving ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>

            <Separator />

            {/* AI 大模型 */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">AI 大模型</h4>
              <p className="text-xs text-muted-foreground -mt-1">用于文章摘要生成、标签推荐等 AI 功能</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ai-base-url">API 地址</Label>
                  <Input id="ai-base-url" value={aiBaseUrl} onChange={(e) => setAiBaseUrl(e.target.value)} placeholder="https://api.openai.com" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ai-model">模型名称</Label>
                  <Input id="ai-model" value={aiModel} onChange={(e) => setAiModel(e.target.value)} placeholder="gpt-4o-mini" />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="ai-api-key">API 密钥</Label>
                  <div className="relative">
                    <Input id="ai-api-key" type={showAiKey ? 'text' : 'password'} value={aiApiKey} onChange={(e) => setAiApiKey(e.target.value)} placeholder="sk-..." />
                    <button type="button" onClick={() => setShowAiKey(!showAiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                      {showAiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleSaveAIConfig} disabled={aiSaving} className="shrink-0 mb-px">
                  {aiSaving ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 账户操作 (危险操作放最后) */}
      <Card>
        <CardHeader>
          <CardTitle>账户操作</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Button variant="outline" onClick={handleLogout} className="w-full sm:w-auto">退出登录</Button>
            <p className="text-xs text-muted-foreground mt-1">退出登录后，你将返回主页</p>
          </div>
          <Separator />
          <div>
            <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)} className="w-full sm:w-auto">注销账号</Button>
            <p className="text-xs text-muted-foreground mt-1">注销后你的文章和评论将被保留，仅用户信息匿名化</p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDeleteConfirm} onOpenChange={(open) => {
        if (!open) setDeleteConfirmEmail('')
        setShowDeleteConfirm(open)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>注销账号</DialogTitle>
            <DialogDescription>
              确定要注销账号吗？你的文章和评论将被保留，但用户信息将匿名化。此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="delete-confirm-email">
              请在下方输入 <span className="font-medium select-all">{user.email}</span> 以确认注销
            </Label>
            <Input
              id="delete-confirm-email"
              type="email"
              value={deleteConfirmEmail}
              onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              placeholder={user.email ?? ''}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDeleteConfirm(false)
              setDeleteConfirmEmail('')
            }} disabled={deletingAccount}>取消</Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deletingAccount || deleteConfirmEmail !== user.email}
            >
              {deletingAccount ? '注销中...' : '确认注销'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showChangePassword} onOpenChange={(open) => { if (!open) resetPasswordDialog() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
            <DialogDescription>
              请先输入当前密码验证身份，然后设置新密码。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="current-pw">当前密码</Label>
              <div className="relative">
                <Input id="current-pw" type={showCurrentPw ? 'text' : 'password'}
                  value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password" />
                <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="new-pw">新密码</Label>
              <div className="relative">
                <Input id="new-pw" type={showNewPw ? 'text' : 'password'}
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password" />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {newPassword.length > 0 && (
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
              <Label htmlFor="confirm-pw">确认新密码</Label>
              <Input id="confirm-pw" type="password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password" />
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">两次输入的密码不一致</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetPasswordDialog} disabled={changingPassword}>取消</Button>
            <Button onClick={handleChangePassword} disabled={changingPassword || newPassword.length < 8 || newPassword !== confirmPassword}>
              {changingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {changingPassword ? '修改中...' : '确认修改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
