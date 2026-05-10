# 附件管理功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在个人中心新增附件管理入口，通过全屏 Dialog 管理已上传的图片（含描述编辑、裁剪）和文档（含描述编辑），类似小型网盘。

**Architecture:** 新增 `attachments` bucket（文档专用，10MB）和 `user_attachments` 元数据表（统一记录图片+文档），新建 `attachment-actions.ts` Server Actions，修改 `image-actions.ts` 上传时同步创建元数据记录，在个人中心页面新增「附件管理」section 含全屏 Dialog（图片/文档两个 Tab），复用 react-easy-crop 做图片二次裁剪。

**Tech Stack:** Next.js Server Actions, Supabase Storage + PostgreSQL, react-easy-crop, browser-image-compression, shadcn/ui (Dialog, Tabs, Button)

---

## File Structure

| 文件                                  | 操作 | 职责                               |
| ------------------------------------- | ---- | ---------------------------------- |
| `supabase/init.sql`                   | 修改 | 新增 attachments bucket + user_attachments 表 + RLS + 回填 SQL |
| `src/lib/actions/attachment-actions.ts`| 新建 | 附件 CRUD Server Actions          |
| `src/lib/actions/image-actions.ts`    | 修改 | uploadContentImage 增加 user_attachments 记录 |
| `src/components/profile/attachment-manager-button.tsx` | 新建 | 入口按钮 + Dialog 容器 |
| `src/components/profile/attachment-dialog.tsx` | 新建 | 全屏 Dialog 主体（Tab 切换） |
| `src/components/profile/image-tab.tsx` | 新建 | 图片网格 + 操作 + 描述编辑 |
| `src/components/profile/document-tab.tsx` | 新建 | 文档列表 + 描述编辑 |
| `src/components/profile/image-crop-dialog.tsx` | 新建 | 图片二次裁剪 |
| `src/app/(blog)/profile/page.tsx`     | 修改 | 新增附件管理 section |

---

### Task 1: SQL — 新增 attachments bucket + user_attachments 表

**Files:**
- Modify: `supabase/init.sql`

- [ ] **Step 1: 在 images bucket 之后追加 attachments bucket + RLS 策略**

在 `supabase/init.sql` 的 images bucket RLS 策略部分之后（`images_owner_delete` 策略之后）追加：

```sql
-- ============================================
-- Attachments storage bucket (10MB, documents)
-- ============================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments', 'attachments', true, 10485760, array[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed'
])
on conflict (id) do nothing;

create policy "attachments_bucket_public_read"
  on storage.objects for select
  using (bucket_id = 'attachments');

create policy "attachments_bucket_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'attachments'
    and auth.uid() = (storage.foldername(name))[1]::uuid
  );

create policy "attachments_bucket_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'attachments'
    and auth.uid() = (storage.foldername(name))[1]::uuid
  );

create policy "attachments_bucket_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'attachments'
    and auth.uid() = (storage.foldername(name))[1]::uuid
  );
```

- [ ] **Step 2: 追加 user_attachments 表 + RLS + 触发器**

在同一位置之后追加：

```sql
-- ============================================
-- User attachments metadata table
-- ============================================

create table if not exists user_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size bigint not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_attachments_user_id on user_attachments(user_id);
create index if not exists idx_user_attachments_created_at on user_attachments(user_id, created_at desc);

alter table user_attachments enable row level security;

create policy "attachments_owner_select"
  on user_attachments for select
  using (auth.uid() = user_id);

create policy "attachments_owner_insert"
  on user_attachments for insert
  with check (auth.uid() = user_id);

create policy "attachments_owner_update"
  on user_attachments for update
  using (auth.uid() = user_id);

create policy "attachments_owner_delete"
  on user_attachments for delete
  using (auth.uid() = user_id);

create trigger set_user_attachments_updated_at
  before update on user_attachments
  for each row execute function update_updated_at();
```

- [ ] **Step 3: 追加回填现有图片的 SQL 注释块**

在同一位置之后追加（作为参考，需在 Supabase 手动执行）：

```sql
-- ============================================
-- Backfill existing images into user_attachments
-- Run manually in Supabase SQL Editor after table creation
-- ============================================

-- insert into user_attachments (user_id, bucket, storage_path, original_name, mime_type, size, created_at)
-- select
--   (storage.foldername(name))[1]::uuid as user_id,
--   'images' as bucket,
--   name as storage_path,
--   name as original_name,
--   coalesce(metadata->>'mimetype', 'image/jpeg') as mime_type,
--   coalesce((metadata->>'size')::bigint, 0) as size,
--   created_at
-- from storage.objects
-- where bucket_id = 'images'
--   and name ~ '^[0-9a-f-]+/img_'
-- on conflict (storage_path) do nothing;
```

- [ ] **Step 4: 验证 SQL 语法**

检查文件无语法错误（无遗漏的分号/括号）。

---

### Task 2: 新建 attachment-actions.ts Server Actions

**Files:**
- Create: `src/lib/actions/attachment-actions.ts`

- [ ] **Step 1: 创建附件 CRUD Server Actions**

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { ErrorCode } from '@/lib/db/types';
import type { ActionResult } from '@/lib/db/types';

const DOC_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DOC_ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
];

const IMAGE_MAX_SIZE = 2 * 1024 * 1024; // 2MB
const IMAGE_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface AttachmentItem {
  id: string;
  bucket: string;
  storagePath: string;
  originalName: string;
  mimeType: string;
  size: number;
  description: string | null;
  createdAt: string;
  url: string;
}

function getExtFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'text/plain': 'txt',
    'text/csv': 'csv',
    'application/zip': 'zip',
    'application/x-zip-compressed': 'zip',
  };
  return map[mimeType] || 'bin';
}

export async function listUserAttachments(
  bucket?: 'images' | 'attachments',
): Promise<ActionResult & { items?: AttachmentItem[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登录', error_code: ErrorCode.UNAUTHORIZED };

  let query = supabase
    .from('user_attachments')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (bucket) query = query.eq('bucket', bucket);

  const { data, error } = query;

  if (error)
    return {
      error: `查询失败: ${error.message}`,
      error_code: ErrorCode.SERVER_ERROR,
    };

  const items: AttachmentItem[] = (data ?? []).map((row) => {
    const { data: urlData } = supabase.storage
      .from(row.bucket)
      .getPublicUrl(row.storage_path);
    return {
      id: row.id,
      bucket: row.bucket,
      storagePath: row.storage_path,
      originalName: row.original_name,
      mimeType: row.mime_type,
      size: row.size,
      description: row.description,
      createdAt: row.created_at,
      url: urlData.publicUrl,
    };
  });

  return { items };
}

export async function uploadAttachment(
  formData: FormData,
): Promise<ActionResult & { item?: AttachmentItem }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登录', error_code: ErrorCode.UNAUTHORIZED };

  const file = formData.get('file') as File;
  if (!file) return { error: '未选择文件', error_code: ErrorCode.VALIDATION };

  const isImage = IMAGE_ALLOWED_TYPES.includes(file.type);
  const isDoc = DOC_ALLOWED_TYPES.includes(file.type);

  if (!isImage && !isDoc)
    return {
      error: '不支持的文件格式',
      error_code: ErrorCode.VALIDATION,
    };

  if (isImage && file.size > IMAGE_MAX_SIZE)
    return { error: '图片不能超过 2MB', error_code: ErrorCode.VALIDATION };

  if (isDoc && file.size > DOC_MAX_SIZE)
    return { error: '文档不能超过 10MB', error_code: ErrorCode.VALIDATION };

  const bucket = isImage ? 'images' : 'attachments';
  const bytes = await file.arrayBuffer();
  const timestamp = Date.now();
  const ext = isImage
    ? file.type === 'image/png'
      ? 'png'
      : file.type === 'image/webp'
        ? 'webp'
        : 'jpg'
    : getExtFromMime(file.type);
  const prefix = isImage ? 'img' : 'doc';
  const storagePath = `${user.id}/${prefix}_${timestamp}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, bytes, { contentType: file.type });

  if (uploadError)
    return {
      error: `上传失败: ${uploadError.message}`,
      error_code: ErrorCode.SERVER_ERROR,
    };

  // Create metadata record
  const { data: record, error: insertError } = await supabase
    .from('user_attachments')
    .insert({
      user_id: user.id,
      bucket,
      storage_path: storagePath,
      original_name: file.name,
      mime_type: file.type,
      size: file.size,
    })
    .select()
    .single();

  if (insertError)
    return {
      error: `记录创建失败: ${insertError.message}`,
      error_code: ErrorCode.SERVER_ERROR,
    };

  const { data: urlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(storagePath);

  return {
    item: {
      id: record.id,
      bucket,
      storagePath,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      description: null,
      createdAt: record.created_at,
      url: urlData.publicUrl,
    },
  };
}

export async function deleteAttachment(
  id: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登录', error_code: ErrorCode.UNAUTHORIZED };

  // Fetch record to get storage path
  const { data: record, error: fetchError } = await supabase
    .from('user_attachments')
    .select('bucket, storage_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (fetchError || !record)
    return { error: '附件不存在', error_code: ErrorCode.NOT_FOUND };

  // Delete from storage
  await supabase.storage.from(record.bucket).remove([record.storage_path]);

  // Delete metadata record
  const { error: deleteError } = await supabase
    .from('user_attachments')
    .delete()
    .eq('id', id);

  if (deleteError)
    return {
      error: `删除失败: ${deleteError.message}`,
      error_code: ErrorCode.SERVER_ERROR,
    };

  return {};
}

export async function updateAttachmentDescription(
  id: string,
  description: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登录', error_code: ErrorCode.UNAUTHORIZED };

  const { error } = await supabase
    .from('user_attachments')
    .update({ description: description.trim() || null })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error)
    return {
      error: `更新失败: ${error.message}`,
      error_code: ErrorCode.SERVER_ERROR,
    };

  return {};
}

export async function replaceImage(
  formData: FormData,
): Promise<ActionResult & { url?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登录', error_code: ErrorCode.UNAUTHORIZED };

  const file = formData.get('file') as File;
  const storagePath = formData.get('storagePath') as string;

  if (!file || !storagePath)
    return { error: '参数不完整', error_code: ErrorCode.VALIDATION };

  if (!IMAGE_ALLOWED_TYPES.includes(file.type))
    return {
      error: '仅支持 JPG, PNG, WebP 格式',
      error_code: ErrorCode.VALIDATION,
    };

  if (file.size > IMAGE_MAX_SIZE)
    return { error: '图片不能超过 2MB', error_code: ErrorCode.VALIDATION };

  // Verify ownership
  const { data: record } = await supabase
    .from('user_attachments')
    .select('id')
    .eq('storage_path', storagePath)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!record)
    return { error: '附件不存在', error_code: ErrorCode.NOT_FOUND };

  const bytes = await file.arrayBuffer();

  // Upload with overwrite (same path)
  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(storagePath, bytes, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError)
    return {
      error: `替换失败: ${uploadError.message}`,
      error_code: ErrorCode.SERVER_ERROR,
    };

  // Update size in metadata
  await supabase
    .from('user_attachments')
    .update({ size: file.size })
    .eq('id', record.id);

  const { data: urlData } = supabase.storage
    .from('images')
    .getPublicUrl(storagePath);

  return { url: urlData.publicUrl };
}
```

- [ ] **Step 2: 类型检查**

```bash
npx tsc --noEmit 2>&1 | grep attachment-actions || echo "No errors for attachment-actions"
```

Expected: 无报错

---

### Task 3: 修改 image-actions.ts — 上传时创建 user_attachments 记录

**Files:**
- Modify: `src/lib/actions/image-actions.ts`

- [ ] **Step 1: 在 uploadContentImage 中添加元数据记录**

在 `uploadContentImage` 函数中，上传成功并获取 publicUrl 之后、return 之前，插入：

```typescript
    // Create metadata record
    await supabase.from('user_attachments').insert({
      user_id: user.id,
      bucket: 'images',
      storage_path: fileName,
      original_name: file.name,
      mime_type: file.type,
      size: file.size,
    });
```

具体位置：在 `const { data: urlData } = ...` 之后、`return { imageUrl: urlData.publicUrl };` 之前。

- [ ] **Step 2: 类型检查**

```bash
npx tsc --noEmit 2>&1 | grep image-actions || echo "No errors"
```

Expected: 无报错

---

### Task 4: 新建 Image Crop Dialog 组件

**Files:**
- Create: `src/components/profile/image-crop-dialog.tsx`

- [ ] **Step 1: 创建图片裁剪 Dialog 组件**

```tsx
'use client';

import { useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Point, Area } from 'react-easy-crop';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  imageSrc: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (croppedBlob: Blob) => void;
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function getCroppedImg(imageSrc: string, crop: Area): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = crop.width;
  canvas.height = crop.height;
  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9);
  });
}

export function ImageCropDialog({ open, imageSrc, onOpenChange, onConfirm }: Props) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedPixels, setCroppedPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleConfirm = async () => {
    if (!imageSrc || !croppedPixels) return;
    setProcessing(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedPixels);
      onConfirm(blob);
    } catch {
      // handled by parent
    }
    setProcessing(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>裁剪图片</DialogTitle>
        </DialogHeader>
        <div className="relative w-full aspect-square bg-black rounded-md overflow-hidden">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={undefined}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, area) => setCroppedPixels(area)}
              showGrid
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1}
            max={5}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={!croppedPixels || processing}>
            {processing ? '处理中...' : '确认'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: 类型检查**

```bash
npx tsc --noEmit 2>&1 | grep image-crop || echo "No errors"
```

Expected: 无报错

---

### Task 5: 新建 Image Tab 组件

**Files:**
- Create: `src/components/profile/image-tab.tsx`

- [ ] **Step 1: 创建图片管理 Tab 组件**

```tsx
'use client';

import { useState, useRef } from 'react';
import browserImageCompression from 'browser-image-compression';
import {
  listUserAttachments,
  uploadAttachment,
  deleteAttachment,
  updateAttachmentDescription,
  replaceImage,
} from '@/lib/actions/attachment-actions';
import type { AttachmentItem } from '@/lib/actions/attachment-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Crop, Pencil, Upload, Check, X, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { ImageCropDialog } from './image-crop-dialog';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  items: AttachmentItem[];
  onRefresh: () => void;
}

export function ImageTab({ items, onRefresh }: Props) {
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<AttachmentItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    toast.loading('上传中...', { id: 'img-upload' });
    const formData = new FormData();
    formData.append('file', file);
    const result = await uploadAttachment(formData);
    toast.dismiss('img-upload');

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('上传成功');
      onRefresh();
    }
  };

  const handleDelete = async (item: AttachmentItem) => {
    const result = await deleteAttachment(item.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('已删除');
      onRefresh();
    }
  };

  const handleCropOpen = (item: AttachmentItem) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = item.url;
    setCropSrc(item.url);
    setCropTarget(item);
    setCropOpen(true);
  };

  const handleCropConfirm = async (blob: Blob) => {
    if (!cropTarget) return;
    setCropOpen(false);

    toast.loading('替换中...', { id: 'img-replace' });
    const file = new File([blob], 'cropped.jpg', { type: blob.type });
    const compressed = await browserImageCompression(file, {
      maxWidthOrHeight: 1920,
      maxSizeMB: 1,
      useWebWorker: true,
    });

    const formData = new FormData();
    formData.append('file', compressed);
    formData.append('storagePath', cropTarget.storagePath);
    const result = await replaceImage(formData);
    toast.dismiss('img-replace');

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('图片已替换');
      onRefresh();
    }

    setCropTarget(null);
    setCropSrc(null);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const startEditDesc = (item: AttachmentItem) => {
    setEditingId(item.id);
    setEditDesc(item.description || '');
  };

  const saveDesc = async (id: string) => {
    const result = await updateAttachmentDescription(id, editDesc);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('描述已更新');
      onRefresh();
    }
    setEditingId(null);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">
          {items.length} 张图片
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5 mr-1" />
          上传图片
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <ImageIcon className="h-8 w-8 mb-2" />
          <p className="text-sm">暂无图片</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-md overflow-hidden border bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.url}
                alt={item.originalName}
                className="w-full aspect-video object-cover cursor-pointer"
                onClick={() => setPreviewUrl(item.url)}
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCropOpen(item)}
                  className="p-1.5 rounded bg-white/20 hover:bg-white/30 text-white"
                  title="裁剪"
                >
                  <Crop className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  className="p-1.5 rounded bg-white/20 hover:bg-white/30 text-white"
                  title="删除"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="px-2 py-1.5 space-y-0.5">
                <p className="text-xs text-muted-foreground truncate">
                  {formatSize(item.size)}
                </p>
                {editingId === item.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="添加描述..."
                      className="h-6 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveDesc(item.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => saveDesc(item.id)}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => startEditDesc(item)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-full text-left truncate"
                  >
                    <span className="truncate">
                      {item.description || '添加描述...'}
                    </span>
                    <Pencil className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview dialog */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
          role="button"
          tabIndex={0}
          aria-label="关闭预览"
          onKeyDown={(e) => {
            if (e.key === 'Escape') setPreviewUrl(null);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="预览"
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <ImageCropDialog
        open={cropOpen}
        imageSrc={cropSrc}
        onOpenChange={setCropOpen}
        onConfirm={handleCropConfirm}
      />
    </>
  );
}
```

- [ ] **Step 2: 类型检查**

```bash
npx tsc --noEmit 2>&1 | grep image-tab || echo "No errors"
```

Expected: 无报错

---

### Task 6: 新建 Document Tab 组件

**Files:**
- Create: `src/components/profile/document-tab.tsx`

- [ ] **Step 1: 创建文档管理 Tab 组件**

```tsx
'use client';

import { useState, useRef } from 'react';
import {
  uploadAttachment,
  deleteAttachment,
  updateAttachmentDescription,
} from '@/lib/actions/attachment-actions';
import type { AttachmentItem } from '@/lib/actions/attachment-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { toast } from 'sonner';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string) {
  if (mimeType === 'application/pdf')
    return <FileText className="h-5 w-5 text-red-500" />;
  if (mimeType.includes('word') || mimeType.includes('document'))
    return <FileText className="h-5 w-5 text-blue-500" />;
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet'))
    return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation'))
    return <FileText className="h-5 w-5 text-orange-500" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

interface Props {
  items: AttachmentItem[];
  onRefresh: () => void;
}

export function DocumentTab({ items, onRefresh }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    toast.loading('上传中...', { id: 'doc-upload' });
    const formData = new FormData();
    formData.append('file', file);
    const result = await uploadAttachment(formData);
    toast.dismiss('doc-upload');

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('上传成功');
      onRefresh();
    }
  };

  const handleDelete = async (item: AttachmentItem) => {
    const result = await deleteAttachment(item.id);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('已删除');
      onRefresh();
    }
  };

  const startEditDesc = (item: AttachmentItem) => {
    setEditingId(item.id);
    setEditDesc(item.description || '');
  };

  const saveDesc = async (id: string) => {
    const result = await updateAttachmentDescription(id, editDesc);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('描述已更新');
      onRefresh();
    }
    setEditingId(null);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">
          {items.length} 个文档
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5 mr-1" />
          上传文档
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <FileText className="h-8 w-8 mb-2" />
          <p className="text-sm">暂无文档</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md border hover:bg-muted/50 transition-colors"
            >
              {getFileIcon(item.mimeType)}
              <div className="flex-1 min-w-0">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium hover:underline truncate block"
                >
                  {item.originalName}
                </a>
                {editingId === item.id ? (
                  <div className="flex items-center gap-1 mt-1">
                    <Input
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="添加描述..."
                      className="h-7 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveDesc(item.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => saveDesc(item.id)}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground truncate">
                    {item.description ? (
                      <button
                        type="button"
                        onClick={() => startEditDesc(item)}
                        className="hover:text-foreground cursor-pointer"
                      >
                        {item.description}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEditDesc(item)}
                        className="hover:text-foreground cursor-pointer"
                      >
                        添加描述...
                      </button>
                    )}
                  </p>
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {formatSize(item.size)}
              </span>
              <button
                type="button"
                onClick={() => startEditDesc(item)}
                className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
                title="编辑描述"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(item)}
                className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                title="删除"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: 类型检查**

```bash
npx tsc --noEmit 2>&1 | grep document-tab || echo "No errors"
```

Expected: 无报错

---

### Task 7: 新建 Attachment Dialog 组件

**Files:**
- Create: `src/components/profile/attachment-dialog.tsx`

- [ ] **Step 1: 创建全屏 Dialog 主体（Tab 切换）**

```tsx
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
import { DocumentTab } from './document-tab';
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
        <div className="flex items-center gap-1 border-b pb-2">
          <button
            type="button"
            onClick={() => setTab('images')}
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
            <ImageTab items={images} onRefresh={fetchData} />
          ) : (
            <DocumentTab items={documents} onRefresh={fetchData} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: 类型检查**

```bash
npx tsc --noEmit 2>&1 | grep attachment-dialog || echo "No errors"
```

Expected: 无报错

---

### Task 8: 新建 Attachment Manager Button 组件

**Files:**
- Create: `src/components/profile/attachment-manager-button.tsx`

- [ ] **Step 1: 创建入口按钮组件**

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FolderOpen } from 'lucide-react';
import { AttachmentDialog } from './attachment-dialog';

export function AttachmentManagerButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <FolderOpen className="h-4 w-4 mr-1.5" />
        打开附件管理
      </Button>
      <AttachmentDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
```

- [ ] **Step 2: 类型检查**

```bash
npx tsc --noEmit 2>&1 | grep attachment-manager-button || echo "No errors"
```

Expected: 无报错

---

### Task 9: 修改个人中心页面 — 新增附件管理 section

**Files:**
- Modify: `src/app/(blog)/profile/page.tsx`

- [ ] **Step 1: 添加 import**

在现有 imports 之后添加：

```typescript
import { AttachmentManagerButton } from '@/components/profile/attachment-manager-button';
import { Paperclip } from 'lucide-react';
```

- [ ] **Step 2: 在「我的标签」section 之后插入附件管理 section**

在 `{/* Module 3: My Tags */}` section 的结束 `</section>` 之后、`{/* Module 4: Guestbook Messages */}` 之前插入：

```tsx
      {/* Module: Attachment Manager */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Paperclip className="h-5 w-5" />
          <h2 className="text-xl font-bold">附件管理</h2>
        </div>
        <AttachmentManagerButton />
      </section>
```

- [ ] **Step 3: 类型检查**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 无类型错误

---

### Task 10: 验证

- [ ] **Step 1: 完整类型检查**

```bash
npx tsc --noEmit
```

Expected: 0 errors

- [ ] **Step 2: ESLint 检查**

```bash
npm run lint
```

Expected: No errors

- [ ] **Step 3: Prettier 格式化**

```bash
npm run format
```

Expected: 格式化完成，无错误

- [ ] **Step 4: 构建验证**

```bash
npm run build
```

Expected: Build succeeds

---

### Task 11: REST API + MCP + 文档更新

**Files:**
- Create: `src/app/api/v1/attachments/route.ts`
- Modify: `scripts/mcp-server.mjs`
- Modify: `public/api/v1/openapi.json`
- Modify: `public/llms.txt`
- Modify: `CLAUDE.md`
- Modify: `src/app/about/page.tsx`

- [ ] **Step 1: 创建 REST API 端点**

创建 `src/app/api/v1/attachments/route.ts`：

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { validateApiKey, authErrorResponse } from '@/lib/api/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { ErrorCode } from '@/lib/db/types';

const DOC_MAX_SIZE = 10 * 1024 * 1024;
const DOC_ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-zip-compressed',
];

function getExtFromMime(mimeType: string): string {
  const map: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'text/plain': 'txt',
    'text/csv': 'csv',
    'application/zip': 'zip',
    'application/x-zip-compressed': 'zip',
  };
  return map[mimeType] || 'bin';
}

// POST /api/v1/attachments — 上传文档附件
export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request);
  const authError = authErrorResponse(auth);
  if (authError) return authError;

  const userId = (auth as { userId: string; keyId: string }).userId;
  const supabase = await createAdminClient();

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file)
      return NextResponse.json(
        { error: '缺少 file 字段', error_code: ErrorCode.VALIDATION },
        { status: 400 },
      );

    if (!DOC_ALLOWED_TYPES.includes(file.type))
      return NextResponse.json(
        { error: '不支持的文档格式', error_code: ErrorCode.VALIDATION },
        { status: 400 },
      );

    if (file.size > DOC_MAX_SIZE)
      return NextResponse.json(
        { error: '文档不能超过 10MB', error_code: ErrorCode.VALIDATION },
        { status: 400 },
      );

    const bytes = await file.arrayBuffer();
    const ext = getExtFromMime(file.type);
    const timestamp = Date.now();
    const storagePath = `${userId}/doc_${timestamp}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(storagePath, bytes, { contentType: file.type });

    if (uploadError)
      return NextResponse.json(
        { error: `上传失败: ${uploadError.message}`, error_code: ErrorCode.SERVER_ERROR },
        { status: 500 },
      );

    const { data: record, error: insertError } = await supabase
      .from('user_attachments')
      .insert({
        user_id: userId,
        bucket: 'attachments',
        storage_path: storagePath,
        original_name: file.name,
        mime_type: file.type,
        size: file.size,
      })
      .select()
      .single();

    if (insertError)
      return NextResponse.json(
        { error: `记录创建失败: ${insertError.message}`, error_code: ErrorCode.SERVER_ERROR },
        { status: 500 },
      );

    const { data: urlData } = supabase.storage
      .from('attachments')
      .getPublicUrl(storagePath);

    return NextResponse.json({
      data: { id: record.id, url: urlData.publicUrl, name: file.name, size: file.size },
    });
  } catch {
    return NextResponse.json(
      { error: '请求格式错误（需使用 multipart/form-data）', error_code: ErrorCode.VALIDATION },
      { status: 400 },
    );
  }
}

// DELETE /api/v1/attachments/:id — 通过 query param ?id=xxx
export async function DELETE(request: NextRequest) {
  const auth = await validateApiKey(request);
  const authError = authErrorResponse(auth);
  if (authError) return authError;

  const userId = (auth as { userId: string; keyId: string }).userId;
  const id = request.nextUrl.searchParams.get('id');

  if (!id)
    return NextResponse.json(
      { error: '缺少 id 参数', error_code: ErrorCode.VALIDATION },
      { status: 400 },
    );

  const supabase = await createAdminClient();

  const { data: record, error: fetchError } = await supabase
    .from('user_attachments')
    .select('bucket, storage_path')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (fetchError || !record)
    return NextResponse.json(
      { error: '附件不存在', error_code: ErrorCode.NOT_FOUND },
      { status: 404 },
    );

  await supabase.storage.from(record.bucket).remove([record.storage_path]);

  const { error: deleteError } = await supabase
    .from('user_attachments')
    .delete()
    .eq('id', id);

  if (deleteError)
    return NextResponse.json(
      { error: `删除失败: ${deleteError.message}`, error_code: ErrorCode.SERVER_ERROR },
      { status: 500 },
    );

  return NextResponse.json({ data: { id } });
}
```

- [ ] **Step 2: MCP — 新增 upload_attachment 和 delete_attachment 工具**

在 `scripts/mcp-server.mjs` 的 `delete_tag` 工具之后、`// ── Start ──` 之前添加：

```javascript
// ── upload_attachment ──
server.registerTool(
  'upload_attachment',
  {
    description:
      'Upload a document file (PDF, Word, Excel, PPT, CSV, TXT, ZIP) to the blog. ' +
      'Returns the file URL and metadata. Max 10MB. ' +
      'filePath must be an absolute path to the file on the local filesystem.',
    inputSchema: {
      filePath: z
        .string()
        .describe(
          'Absolute path to the local file (e.g. "/home/user/report.pdf")',
        ),
    },
  },
  async ({ filePath }) => {
    let file;
    try {
      file = readFileSync(filePath);
    } catch (err) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Cannot read file "${filePath}" — ${err.message}.`,
          },
        ],
        isError: true,
      };
    }
    const ext = filePath.split('.').pop()?.toLowerCase();
    const mimeMap = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      csv: 'text/csv',
      zip: 'application/zip',
    };
    const mimeType = mimeMap[ext] || 'application/octet-stream';
    const blob = new Blob([file], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, filePath.split(/[/\\]/).pop() || `file.${ext}`);
    const data = await api('/attachments', {
      method: 'POST',
      body: formData,
    });
    if (data?.error) return formatResult(data);
    return {
      content: [
        {
          type: 'text',
          text: `Attachment uploaded!\nName: ${data.data?.name}\nURL: ${data.data?.url}\nSize: ${data.data?.size} bytes`,
        },
      ],
    };
  },
);

// ── delete_attachment ──
server.registerTool(
  'delete_attachment',
  {
    description:
      'Delete an attachment by its ID. Removes both the file and its metadata. ' +
      'Get attachment IDs from the attachment manager or API.',
    inputSchema: {
      id: z.string().describe('Attachment ID to delete'),
    },
  },
  async ({ id }) => {
    const data = await api(`/attachments?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (data?.error) return formatResult(data);
    return {
      content: [{ type: 'text', text: 'Attachment deleted.' }],
    };
  },
);
```

- [ ] **Step 3: 更新 OpenAPI 规范**

在 `public/api/v1/openapi.json` 的 `"/tags":` 之前添加：

```json
    "/attachments": {
      "post": {
        "summary": "上传文档附件",
        "requestBody": {
          "required": true,
          "content": {
            "multipart/form-data": {
              "schema": {
                "type": "object",
                "required": ["file"],
                "properties": {
                  "file": { "type": "string", "format": "binary", "description": "文档文件（PDF/Word/Excel/PPT/TXT/CSV/ZIP，≤10MB）" }
                }
              }
            }
          }
        },
        "responses": {
          "200": { "description": "上传成功", "content": { "application/json": { "schema": { "type": "object", "properties": { "data": { "type": "object", "properties": { "id": { "type": "string" }, "url": { "type": "string" }, "name": { "type": "string" }, "size": { "type": "integer" } } } } } } } },
          "400": { "description": "文件格式或大小错误", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ErrorResponse" } } } },
          "401": { "description": "未认证", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ErrorResponse" } } } },
          "500": { "description": "服务端错误", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ErrorResponse" } } } }
        }
      },
      "delete": {
        "summary": "删除附件",
        "parameters": [
          { "name": "id", "in": "query", "required": true, "schema": { "type": "string" }, "description": "附件 ID" }
        ],
        "responses": {
          "200": { "description": "删除成功" },
          "401": { "description": "未认证", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ErrorResponse" } } } },
          "404": { "description": "附件不存在", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ErrorResponse" } } } },
          "500": { "description": "服务端错误", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ErrorResponse" } } } }
        }
      }
    },
```

- [ ] **Step 4: 更新 llms.txt**

MCP 工具表标题 `17` → `19`，添加两行：

```
| upload_attachment | 上传文档附件（PDF/Word/Excel/PPT 等） | `filePath`（本地绝对路径） |
| delete_attachment | 删除附件 | `id` |
```

REST API 表添加：

```
| POST | `/api/v1/attachments` | 上传文档附件（multipart/form-data, file 字段） |
| DELETE | `/api/v1/attachments` | 删除附件（query: id） |
```

- [ ] **Step 5: 更新 CLAUDE.md**

MCP 工具计数 `17` → `19`，工具列表添加 `upload_attachment`, `delete_attachment`，API 表添加：

```
| `POST`   | `/api/v1/attachments`          | 上传文档附件                            |
| `DELETE` | `/api/v1/attachments?id=xxx`   | 删除附件                                |
```

- [ ] **Step 6: 更新 about 页面**

MCP 工具计数 `17` → `19`，功能特性添加「附件管理（图片+文档，支持描述、裁剪、删除）」。

- [ ] **Step 7: 类型检查 + 格式化 + 构建**

```bash
npx tsc --noEmit && npm run format && npm run build
```

Expected: 全部通过
