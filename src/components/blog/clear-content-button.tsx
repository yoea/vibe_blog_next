'use client';

import { useState, useTransition } from 'react';
import { Eraser } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { deleteDraft } from '@/lib/actions/draft-actions';

export function ClearContentButton({
  postId,
  onClear,
}: {
  postId: string;
  onClear?: () => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleClear = () => {
    startTransition(async () => {
      await deleteDraft(postId);
      onClear?.();
      setShowConfirm(false);
    });
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setShowConfirm(true)}>
        <Eraser className="h-4 w-4 sm:mr-1" />
        <span className="hidden sm:inline">清空内容</span>
      </Button>
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>清空内容</DialogTitle>
            <DialogDescription>
              清空后当前编辑内容将被清除，已发布的文章不受影响。
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
              onClick={handleClear}
              disabled={isPending}
            >
              {isPending ? '清空中...' : '确认清空'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
