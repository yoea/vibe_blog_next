'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';
import { Trash2, Crop, Pencil, Upload, Check, X, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImageCropDialog } from './image-crop-dialog';
import {
  listUserAttachments,
  uploadAttachment,
  deleteAttachment,
  updateAttachmentDescription,
  replaceImage,
} from '@/lib/actions/attachment-actions';
import type { AttachmentItem } from '@/lib/actions/attachment-actions';

interface Props {
  items: AttachmentItem[];
  onRefresh: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageTab({ items, onRefresh }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Crop state
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropItem, setCropItem] = useState<AttachmentItem | null>(null);

  // Description editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');

  // Uploading state
  const [uploading, setUploading] = useState(false);

  // --- Upload ---
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    toast.loading('上传中...', { id: 'upload' });
    const res = await uploadAttachment(fd);
    toast.dismiss('upload');
    setUploading(false);

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('上传成功');
      onRefresh();
    }

    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Delete ---
  const handleDelete = async (item: AttachmentItem) => {
    const res = await deleteAttachment(item.id);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('已删除');
      onRefresh();
    }
  };

  // --- Crop ---
  const handleCropClick = (item: AttachmentItem) => {
    setCropItem(item);
    setCropSrc(item.url);
    setCropOpen(true);
  };

  const handleCropConfirm = async (blob: Blob) => {
    if (!cropItem) return;
    setCropOpen(false);

    const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg' });
    const compressed = await imageCompression(file, {
      maxSizeMB: 2,
      maxWidthOrHeight: 4096,
      useWebWorker: true,
    });

    const fd = new FormData();
    fd.append('file', compressed);
    fd.append('storagePath', cropItem.storagePath);

    toast.loading('替换中...', { id: 'crop' });
    const res = await replaceImage(fd);
    toast.dismiss('crop');

    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('裁剪完成');
      onRefresh();
    }

    setCropItem(null);
    setCropSrc(null);
  };

  // --- Description editing ---
  const startEditing = (item: AttachmentItem) => {
    setEditingId(item.id);
    setEditingValue(item.description ?? '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingValue('');
  };

  const saveDescription = async (id: string) => {
    const res = await updateAttachmentDescription(id, editingValue);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('已保存');
      setEditingId(null);
      setEditingValue('');
      onRefresh();
    }
  };

  const handleDescKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveDescription(id);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  // --- Render ---
  return (
    <div className="space-y-4">
      {/* Upload button */}
      <div className="flex justify-end">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
          data-testid="image-upload-input"
        />
        <Button
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          data-testid="image-upload-button"
        >
          <Upload className="mr-1.5 h-4 w-4" />
          上传图片
        </Button>
      </div>

      {/* Empty state */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mb-3 opacity-40" />
          <p className="text-sm">暂无图片</p>
          <p className="text-xs mt-1">点击上方按钮上传第一张图片</p>
        </div>
      ) : (
        /* Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-lg border overflow-hidden bg-muted/30"
              data-testid={`image-card-${item.id}`}
            >
              {/* Thumbnail */}
              <button
                type="button"
                className="relative aspect-square w-full overflow-hidden cursor-pointer"
                onClick={() => setPreviewUrl(item.url)}
                aria-label={`预览 ${item.originalName}`}
                data-testid={`image-preview-${item.id}`}
              >
                <img
                  src={item.url}
                  alt={item.originalName}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                {/* Size badge */}
                <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                  {formatSize(item.size)}
                </span>
              </button>

              {/* Hover actions */}
              <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleCropClick(item)}
                  aria-label="裁剪"
                  data-testid={`image-crop-${item.id}`}
                >
                  <Crop className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleDelete(item)}
                  aria-label="删除"
                  data-testid={`image-delete-${item.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Description */}
              <div className="p-2 min-h-[44px]">
                {editingId === item.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => handleDescKeyDown(e, item.id)}
                      className="h-7 text-xs"
                      autoFocus
                      data-testid={`image-desc-input-${item.id}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => saveDescription(item.id)}
                      aria-label="保存"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={cancelEditing}
                      aria-label="取消"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group/desc"
                    onClick={() => startEditing(item)}
                    data-testid={`image-desc-${item.id}`}
                  >
                    <span className="truncate flex-1">
                      {item.description || '添加描述...'}
                    </span>
                    <Pencil className="h-3 w-3 opacity-0 group-hover/desc:opacity-100 shrink-0" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview overlay */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-pointer"
          onClick={() => setPreviewUrl(null)}
          data-testid="image-preview-overlay"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="预览"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Crop dialog */}
      <ImageCropDialog
        open={cropOpen}
        imageSrc={cropSrc}
        onOpenChange={setCropOpen}
        onConfirm={handleCropConfirm}
      />
    </div>
  );
}
