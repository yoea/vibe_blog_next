'use client';

import { useState, useRef } from 'react';
import {
  Trash2,
  Pencil,
  Upload,
  Check,
  X,
  FileText,
  FileSpreadsheet,
  File,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  uploadAttachment,
  deleteAttachment,
  updateAttachmentDescription,
} from '@/lib/actions/attachment-actions';
import type { AttachmentItem } from '@/lib/actions/attachment-actions';

interface Props {
  items: AttachmentItem[];
  setItems: React.Dispatch<React.SetStateAction<AttachmentItem[]>>;
}

/** 格式化文件大小 */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** 根据 MIME 类型返回对应颜色的图标 */
function getFileIcon(mimeType: string) {
  if (mimeType === 'application/pdf') {
    return <FileText className="h-5 w-5 text-red-500" />;
  }
  if (
    mimeType === 'application/msword' ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return <FileText className="h-5 w-5 text-blue-500" />;
  }
  if (
    mimeType === 'application/vnd.ms-excel' ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
  }
  if (
    mimeType === 'application/vnd.ms-powerpoint' ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    return <FileText className="h-5 w-5 text-orange-500" />;
  }
  return <File className="h-5 w-5 text-gray-500" />;
}

const ACCEPT_TYPES =
  '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip';

export default function DocumentTab({ items, setItems }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  // 上传
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const id = toast.loading('上传中...');

    const formData = new FormData();
    formData.append('file', file);
    const result = await uploadAttachment(formData);

    if (result.error) {
      toast.error(result.error, { id });
    } else if (result.item) {
      toast.success('上传成功', { id });
      setItems((prev) => [result.item!, ...prev]);
    }

    setUploading(false);
    // 重置 input 以便重复上传同一文件
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // 删除
  async function handleDelete(id: string) {
    setDeleting(id);
    const result = await deleteAttachment(id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('已删除');
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
    setDeleting(null);
  }

  // 描述编辑
  function startEdit(item: AttachmentItem) {
    setEditingId(item.id);
    setEditValue(item.description || '');
  }

  async function saveEdit() {
    if (!editingId) return;
    const result = await updateAttachmentDescription(editingId, editValue);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('已更新');
      const value = editValue;
      setEditingId(null);
      setItems((prev) =>
        prev.map((i) =>
          i.id === editingId ? { ...i, description: value.trim() || null } : i,
        ),
      );
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue('');
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  }

  return (
    <div data-testid="document-tab" className="space-y-4">
      {/* 上传按钮 */}
      <div className="flex justify-end">
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT_TYPES}
          onChange={handleUpload}
          className="hidden"
          data-testid="document-file-input"
        />
        <Button
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          data-testid="document-upload-button"
        >
          <Upload className="mr-1 h-4 w-4" />
          上传文档
        </Button>
      </div>

      {/* 文档列表 */}
      {items.length === 0 ? (
        <div
          data-testid="document-empty-state"
          className="text-muted-foreground flex flex-col items-center justify-center py-12 gap-2"
        >
          <File className="h-10 w-10" />
          <p>暂无文档</p>
        </div>
      ) : (
        <div className="space-y-2" data-testid="document-list">
          {items.map((item) => (
            <div
              key={item.id}
              data-testid={`document-item-${item.id}`}
              className="rounded-lg border p-3"
            >
              {/* 第一行：图标 + 文件名 + 大小 + 操作按钮 */}
              <div className="flex items-center gap-3">
                {/* 文件类型图标 */}
                <div className="shrink-0">{getFileIcon(item.mimeType)}</div>

                {/* 文件名（可点击下载） */}
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={item.originalName}
                  className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                  data-testid={`document-name-${item.id}`}
                >
                  {item.originalName}
                </a>

                {/* 文件大小 */}
                <span className="text-muted-foreground shrink-0 text-xs">
                  {formatSize(item.size)}
                </span>

                {/* 编辑描述按钮 */}
                {editingId !== item.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => startEdit(item)}
                    aria-label="编辑描述"
                    data-testid={`document-desc-edit-btn-${item.id}`}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}

                {/* 删除按钮 */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive shrink-0"
                  onClick={() => handleDelete(item.id)}
                  disabled={deleting === item.id}
                  aria-label="删除文档"
                  data-testid={`document-delete-${item.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* 第二行：描述 */}
              <div className="mt-1.5 pl-8 sm:pl-8">
                {editingId === item.id ? (
                  <div className="flex items-center gap-1" data-testid={`document-desc-edit-${item.id}`}>
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={handleEditKeyDown}
                      placeholder="输入描述..."
                      className="h-7 text-xs"
                      autoFocus
                      data-testid={`document-desc-input-${item.id}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={saveEdit}
                      aria-label="保存描述"
                      data-testid={`document-desc-save-${item.id}`}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={cancelEdit}
                      aria-label="取消编辑"
                      data-testid={`document-desc-cancel-${item.id}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <span
                    className="text-muted-foreground text-xs"
                    data-testid={`document-desc-${item.id}`}
                  >
                    {item.description || '添加描述...'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
