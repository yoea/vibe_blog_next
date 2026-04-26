'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { updateUserSettings } from '@/lib/actions/settings-actions'
import { resetPasswordForEmail } from '@/lib/actions/auth-actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface Props {
  user: User
  displayName: string
}

export function SettingsForm({ user, displayName }: Props) {
  const [name, setName] = useState(displayName)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSave = async () => {
    setError('')
    const res = await updateUserSettings(name)
    if (res.error) {
      setError(res.error)
    } else {
      toast.success('保存成功')
      router.refresh()
    }
  }

  const handleResetPassword = async () => {
    const res = await resetPasswordForEmail()
    if (res.error) {
      toast.error(res.error)
    } else {
      toast.success('密码重置邮件已发送，请检查邮箱')
    }
  }

  const formatDate = (val: string | undefined) =>
    val ? new Date(val).toLocaleString('zh-CN') : '-'

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>个人信息</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">显示用户名</Label>
            <Input
              id="displayName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="邮箱前缀"
            />
            <p className="text-xs text-muted-foreground">
              留空则默认使用邮箱前缀
            </p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={handleSave} className="mt-2">保存设置</Button>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>密码</Label>
            <Button variant="outline" onClick={handleResetPassword}>重置密码</Button>
            <p className="text-xs text-muted-foreground">
              点击后将发送一封密码重置邮件到你的注册邮箱，请在邮件中完成新密码的设置
            </p>
          </div>
          <Separator />
          <div className="space-y-2 text-sm">
            <InfoRow label="用户 ID" value={user.id} />
            <InfoRow label="邮箱" value={user.email ?? '-'} verified={!!user.email_confirmed_at} />
            <InfoRow label="手机号" value={user.phone || '未设置'} verified={!!user.phone_confirmed_at} />
            <InfoRow label="最后登录" value={formatDate(user.last_sign_in_at)} />
            <InfoRow label="注册时间" value={formatDate(user.created_at)} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function InfoRow({ label, value, verified }: { label: string; value: string; verified?: boolean }) {
  return (
    <div className="py-1">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-xs break-all">{value}</span>
        {verified !== undefined && (
          verified
            ? <span className="inline-flex items-center gap-0.5 text-xs text-green-600 shrink-0"><span className="text-green-500"> ✓</span>已验证</span>
            : <span className="inline-flex items-center gap-0.5 text-xs text-orange-500 shrink-0"><span> ⚠</span>未验证</span>
        )}
      </div>
    </div>
  )
}
