# 文章内插入图片功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Markdown 编辑器中支持通过工具栏按钮和拖拽上传图片，自动压缩后上传到 Supabase Storage，在光标处插入 `![图片](url)`。

**Architecture:** 新增 `images` Storage bucket（公开读，2MB 限制），新建 `image-actions.ts` 服务端上传 Action（复用 cover-actions 模式），在编辑器组件中添加工具栏 + 拖拽上传 + `insertAtCursor` 逻辑，使用 `browser-image-compression` 库做客户端压缩。

**Tech Stack:** Next.js Server Actions, Supabase Storage, browser-image-compression, React (useState/useRef/useCallback)

---

## File Structure

| 文件                                  | 操作         | 职责                               |
| ------------------------------------- | ------------ | ---------------------------------- |
| `supabase/init.sql`                   | 修改（追加） | 新增 images bucket + RLS 策略      |
| `src/lib/actions/image-actions.ts`    | 新建         | 图片上传 server action             |
| `src/components/blog/post-editor.tsx` | 修改         | 工具栏按钮 + 拖拽 + insertAtCursor |

## Dependencies

- `browser-image-compression` — 客户端图片压缩

---

### Task 1: 安装依赖

**Files:**

- Modify: `package.json`

- [ ] **Step 1: 安装 browser-image-compression**

```bash
npm i browser-image-compression
```

Expected: 安装成功，`package.json` 出现 `browser-image-compression` 依赖

- [ ] **Step 2: 验证类型定义可用**

```bash
npx tsc --noEmit 2>&1 | head -5
```

Expected: 无新类型错误（browser-image-compression 自带类型定义）

---

### Task 2: 新增 images Storage bucket SQL

**Files:**

- Modify: `supabase/init.sql`（在 covers bucket 之后追加）

- [ ] **Step 1: 追加 images bucket 和 RLS 策略**

在 `supabase/init.sql` 的 covers bucket 部分（第 498 行 `-- Migration` 之前）追加：

```sql
-- ============================================
-- Images storage bucket (2MB, post content images)
-- ============================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "images_public_read"
  on storage.objects for select
  using (bucket_id = 'images');

create policy "images_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'images'
    and auth.uid() = (storage.foldername(name))[1]::uuid
  );

create policy "images_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'images'
    and auth.uid() = (storage.foldername(name))[1]::uuid
  );

create policy "images_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'images'
    and auth.uid() = (storage.foldername(name))[1]::uuid
  );
```

- [ ] **Step 2: 验证 SQL 语法**

检查文件无语法错误（无遗漏的分号/括号）。

---

### Task 3: 新建 image-actions.ts 上传 Action

**Files:**

- Create: `src/lib/actions/image-actions.ts`

- [ ] **Step 1: 创建上传 Action**

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { ErrorCode } from '@/lib/db/types';
import type { ActionResult } from '@/lib/db/types';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function uploadContentImage(
  formData: FormData,
): Promise<ActionResult & { imageUrl?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: '未登录', error_code: ErrorCode.UNAUTHORIZED };

  const file = formData.get('image') as File;
  if (!file) return { error: '未选择文件', error_code: ErrorCode.VALIDATION };

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      error: '仅支持 JPG, PNG, WebP 格式',
      error_code: ErrorCode.VALIDATION,
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: '图片不能超过 2MB', error_code: ErrorCode.VALIDATION };
  }

  const bytes = await file.arrayBuffer();
  const ext =
    file.type === 'image/png'
      ? 'png'
      : file.type === 'image/webp'
        ? 'webp'
        : 'jpg';
  const timestamp = Date.now();
  const fileName = `${user.id}/img_${timestamp}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(fileName, bytes, { contentType: file.type });

  if (uploadError)
    return {
      error: `上传失败: ${uploadError.message}`,
      error_code: ErrorCode.SERVER_ERROR,
    };

  const { data: urlData } = supabase.storage
    .from('images')
    .getPublicUrl(fileName);

  return { imageUrl: urlData.publicUrl };
}
```

- [ ] **Step 2: 类型检查**

```bash
npx tsc --noEmit 2>&1 | grep image-actions || echo "No errors for image-actions"
```

Expected: 无报错

---

### Task 4: 修改编辑器 — 添加工具栏图片按钮和 insertAtCursor

**Files:**

- Modify: `src/components/blog/post-editor.tsx`

- [ ] **Step 1: 添加 import**

在文件顶部现有 imports 之后添加：

```typescript
import { uploadContentImage } from '@/lib/actions/image-actions';
import imageCompression from 'browser-image-compression';
import { ImagePlus } from 'lucide-react';
```

同时在 `useRef` 引入的 React hooks 中确保有 `useCallback`（已有）。

- [ ] **Step 2: 添加上传相关状态和 ref**

在 `PostEditor` 组件内，`const [tagInput, setTagInput] = useState('');` 之后添加：

```typescript
const [uploading, setUploading] = useState(false);
const fileInputRef = useRef<HTMLInputElement>(null);
const inlineRef = useRef<HTMLTextAreaElement>(null);
```

- [ ] **Step 3: 添加 insertAtCursor 辅助函数**

在 `autoGrow` 函数之后添加：

```typescript
const insertAtCursor = useCallback(
  (ref: React.RefObject<HTMLTextAreaElement | null>, text: string) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = content.slice(0, start);
    const after = content.slice(end);
    const newContent = before + text + after;
    setContent(newContent.slice(0, CONTENT_MAX_LENGTH));
    // Restore cursor after inserted text
    requestAnimationFrame(() => {
      const pos = start + text.length;
      el.selectionStart = pos;
      el.selectionEnd = pos;
      el.focus();
    });
  },
  [content],
);
```

- [ ] **Step 4: 添加 handleImageUpload 函数**

在 `insertAtCursor` 之后添加：

```typescript
const handleImageUpload = useCallback(
  async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }

    setUploading(true);
    toast.loading('上传中...', { id: 'image-upload' });

    try {
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 1920,
        maxSizeMB: 1,
        useWebWorker: true,
      });

      const formData = new FormData();
      formData.append('image', compressed);

      const result = await uploadContentImage(formData);

      if (result.error) {
        toast.error(result.error, { id: 'image-upload' });
        return;
      }

      if (result.imageUrl) {
        // Insert into the focused textarea, or inline by default
        const targetRef = fullscreen ? inlineRef : inlineRef;
        // The fullscreen textarea doesn't have a ref, so we insert at end
        if (fullscreen) {
          setContent((prev) => prev + `\n![图片](${result.imageUrl})\n`);
        } else {
          insertAtCursor(targetRef, `\n![图片](${result.imageUrl})\n`);
        }
        toast.success('已插入图片', { id: 'image-upload' });
      }
    } catch {
      toast.error('图片处理失败', { id: 'image-upload' });
    } finally {
      setUploading(false);
    }
  },
  [fullscreen, insertAtCursor],
);

const handleFileSelect = useCallback(
  (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
    // Reset input so same file can be selected again
    e.target.value = '';
  },
  [handleImageUpload],
);
```

- [ ] **Step 5: 在内联 textarea 的 ref 中使用 inlineRef**

将 `contentRef` 替换为 `inlineRef`（在 textarea 元素上）。具体来说：

1. 将 line 94 的 `const contentRef = useRef<HTMLTextAreaElement>(null);` 删除（`autoGrow` 中的引用也要改）
2. `autoGrow` 中的 `contentRef.current` 改为 `inlineRef.current`
3. textarea 上的 `ref={contentRef}` 改为 `ref={inlineRef}`

修改 autoGrow：

```typescript
const autoGrow = useCallback(() => {
  const el = inlineRef.current;
  if (!el) return;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 120 + 'px';
  window.scrollTo(scrollX, scrollY);
}, []);
```

- [ ] **Step 6: 在 textarea 上方添加工具栏**

找到 `{tab === 'edit' ? (` 分支内的 `<div className="relative">`，在其内部、textarea 之前添加工具栏：

```tsx
<div className="flex items-center gap-1 pb-1.5">
  <button
    type="button"
    onClick={() => fileInputRef.current?.click()}
    disabled={uploading}
    className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
    aria-label="插入图片"
    data-testid="editor-image-upload"
    title="插入图片"
  >
    <ImagePlus className="h-3.5 w-3.5" />
    <span className="hidden sm:inline">图片</span>
  </button>
  <input
    ref={fileInputRef}
    type="file"
    accept="image/*"
    onChange={handleFileSelect}
    className="hidden"
    data-testid="editor-image-input"
  />
</div>
```

- [ ] **Step 7: 在 textarea 上添加拖拽事件**

在 textarea 元素上添加拖拽属性：

```tsx
              <textarea
                ref={inlineRef}
                id="content"
                value={content}
                onChange={(e) => {
                  setContent(e.target.value.slice(0, CONTENT_MAX_LENGTH));
                }}
                onDragOver={(e) => {
                  if (e.dataTransfer.types.includes('Files')) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                  }
                }}
                onDrop={(e) => {
                  const file = e.dataTransfer.files[0];
                  if (file && file.type.startsWith('image/')) {
                    e.preventDefault();
                    handleImageUpload(file);
                  }
                }}
                maxLength={CONTENT_MAX_LENGTH}
                placeholder="# 开始写作...\n支持 Markdown 语法，拖拽图片到此处上传"
                data-testid="post-content"
                // ... rest of existing props unchanged
```

- [ ] **Step 8: 类型检查**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 无类型错误

- [ ] **Step 9: 运行 Prettier 格式化**

```bash
npm run format
```

Expected: 格式化完成，无错误

---

### Task 5: 验证

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

- [ ] **Step 3: 构建验证**

```bash
npm run build
```

Expected: Build succeeds
