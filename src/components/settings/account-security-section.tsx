'use client';

import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';

interface Props {
  user: User;
}

export function AccountSecuritySection({ user }: Props) {
  const [showDialog, setShowDialog] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const strengthChecks = [
    { label: '至少 8 个字符', pass: newPassword.length >= 8 },
    { label: '包含大写字母', pass: /[A-Z]/.test(newPassword) },
    { label: '包含小写字母', pass: /[a-z]/.test(newPassword) },
    { label: '包含数字', pass: /\d/.test(newPassword) },
  ];
  const strength = strengthChecks.filter((c) => c.pass).length;

  const resetDialog = () => {
    setShowDialog(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast.error('新密码长度至少 8 个字符');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }
    if (newPassword === currentPassword) {
      toast.error('新密码不能与当前密码相同');
      return;
    }

    setChangingPassword(true);
    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });
    if (signInError) {
      setChangingPassword(false);
      toast.error('当前密码不正确');
      return;
    }

    document.cookie = 'skip_login_toast=1; max-age=10; path=/';
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setChangingPassword(false);

    if (updateError) {
      toast.error(updateError.message);
    } else {
      toast.success('密码修改成功');
      resetDialog();
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>账户安全</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => setShowDialog(true)}
            className="w-full sm:w-auto hover:border-foreground/30 hover:shadow-sm"
          >
            修改密码
          </Button>
          <p className="text-xs text-muted-foreground mt-1">
            验证当前密码后设置新密码。
          </p>
        </CardContent>
      </Card>

      <Dialog
        open={showDialog}
        onOpenChange={(open) => {
          if (!open) resetDialog();
        }}
      >
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
                <Input
                  id="current-pw"
                  type={showCurrentPw ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showCurrentPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="new-pw">新密码</Label>
              <div className="relative">
                <Input
                  id="new-pw"
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showNewPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {newPassword.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i <= strength
                            ? strength <= 1
                              ? 'bg-red-400'
                              : strength <= 2
                                ? 'bg-yellow-400'
                                : strength <= 3
                                  ? 'bg-blue-400'
                                  : 'bg-green-500'
                            : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <ul className="space-y-0.5">
                    {strengthChecks.map((check) => (
                      <li
                        key={check.label}
                        className={`text-xs flex items-center gap-1 ${check.pass ? 'text-green-600' : 'text-muted-foreground'}`}
                      >
                        <ShieldCheck
                          className={`h-3 w-3 ${check.pass ? 'text-green-500' : 'opacity-30'}`}
                        />
                        {check.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-pw">确认新密码</Label>
              <Input
                id="confirm-pw"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              {confirmPassword.length > 0 &&
                newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive">
                    两次输入的密码不一致
                  </p>
                )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={resetDialog}
              disabled={changingPassword}
            >
              取消
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={
                changingPassword ||
                newPassword.length < 8 ||
                newPassword !== confirmPassword
              }
            >
              {changingPassword && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {changingPassword ? '修改中...' : '确认修改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
