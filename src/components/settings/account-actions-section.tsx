'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import {
  logout,
  onAuthChange,
  deleteAccount,
} from '@/lib/actions/auth-actions';
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

interface Props {
  user: User;
}

export function AccountActionsSection({ user }: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    await onAuthChange();
    toast.success('已退出登录');
    window.location.href = '/login';
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    const { error } = await deleteAccount();
    setDeletingAccount(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success('账号已注销');
      router.push('/');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>账户操作</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full sm:w-auto hover:border-foreground/30 hover:shadow-sm"
            >
              退出登录
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              退出登录后，你将返回主页
            </p>
          </div>
          <Separator />
          <div>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full sm:w-auto hover:bg-destructive/30 hover:shadow-sm"
            >
              注销账号
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              注销后你的文章和评论将被保留，仅用户信息匿名化
            </p>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={showDeleteConfirm}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmEmail('');
          setShowDeleteConfirm(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>注销账号</DialogTitle>
            <DialogDescription>
              确定要注销账号吗？你的文章和评论将被保留，但用户信息将匿名化。此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label
              htmlFor="delete-confirm-email"
              className="text-sm select-text"
            >
              输入您的邮箱 {user.email} 以确认注销
            </Label>
            <Input
              id="delete-confirm-email"
              type="email"
              value={deleteConfirmEmail}
              onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              placeholder={user.email ?? 'you@example.com'}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteConfirmEmail('');
              }}
              disabled={deletingAccount}
            >
              取消
            </Button>
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
    </>
  );
}
