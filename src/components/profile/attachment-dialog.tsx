'use client';

import { useState, useEffect, useCallback } from 'react';
import { listUserAttachments } from '@/lib/actions/attachment-actions';
import type { AttachmentItem } from '@/lib/actions/attachment-actions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ImageTab } from './image-tab';
import DocumentTab from './document-tab';
import { ImageIcon, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AttachmentDialog({ open, onOpenChange }: Props) {
  const [tab, setTab] = useState<'images' | 'documents'>('images');
  const [images, setImages] = useState<AttachmentItem[]>([]);
  const [documents, setDocuments] = useState<AttachmentItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [imgResult, docResult] = await Promise.all([
      listUserAttachments('images'),
      listUserAttachments('attachments'),
    ]);
    setLoading(false);

    if (imgResult.error) toast.error(imgResult.error);
    else setImages(imgResult.items ?? []);

    if (docResult.error) toast.error(docResult.error);
    else setDocuments(docResult.items ?? []);
  }, []);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>附件管理</DialogTitle>
        </DialogHeader>

        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b pb-2" data-testid="attachment-tabs">
          <button
            type="button"
            onClick={() => setTab('images')}
            data-testid="attachment-tab-images"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
              tab === 'images'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <ImageIcon className="h-4 w-4" />
            图片 ({images.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('documents')}
            data-testid="attachment-tab-documents"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
              tab === 'documents'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <FileText className="h-4 w-4" />
            文档 ({documents.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              加载中...
            </p>
          ) : tab === 'images' ? (
            <ImageTab items={images} setItems={setImages} />
          ) : (
            <DocumentTab items={documents} setItems={setDocuments} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
