'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { deletePost } from '@/lib/actions/post-actions';
import { toast } from 'sonner';

interface Props {
  postId: string;
  postTitle: string;
}

export function DeletePostButton({ postId, postTitle }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deletePost(postId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('文章已删除');
      setShowConfirm(false);
      router.push('/profile');
      router.refresh();
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:text-destructive hover:border-destructive/50"
        onClick={() => setShowConfirm(true)}
      >
        <Trash2 className="h-4 w-4 sm:mr-1" />
        <span className="hidden sm:inline">删除文章</span>
      </Button>
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除文章</DialogTitle>
            <DialogDescription>
              确定要删除「{postTitle}
              」吗？此操作不可撤销，文章及其所有评论将永久删除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={isPending}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
