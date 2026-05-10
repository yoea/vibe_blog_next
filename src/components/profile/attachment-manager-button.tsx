'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FolderOpen } from 'lucide-react';
import { AttachmentDialog } from './attachment-dialog';

export function AttachmentManagerButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        data-testid="attachment-manager-btn"
      >
        <FolderOpen className="h-4 w-4 mr-1.5" />
        打开附件管理
      </Button>
      <AttachmentDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
