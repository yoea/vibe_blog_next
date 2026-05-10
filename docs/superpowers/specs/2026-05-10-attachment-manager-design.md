# 附件管理功能设计

## Context

当前博客系统有 3 个图片专用 Supabase Storage bucket（avatars/covers/images），没有文件元数据表。
用户需要一个类似小型网盘的附件管理功能，统一管理已上传的图片和文档类文件。

## 需求

- 入口：个人中心（`/profile`）页面，「我的标签」之后新增「附件管理」section，点击按钮弹出全屏 Dialog
- 范围：每个用户只能管理自己上传的附件
- 图片：复用现有 `images` bucket，支持上传、删除、查看大小、原地裁剪替换、编辑描述
- 文档：新建 `attachments` bucket（10MB），支持 PDF/Word/Excel/PPT/文本/CSV/ZIP
- 统一元数据：新建 `user_attachments` 表，图片和文档都创建记录，支持添加/编辑描述
- 现有图片回填：SQL 迁移脚本从 storage.objects 回填已有图片的元数据记录

## 存储架构

### 新增 bucket：attachments

```sql
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
```

RLS 策略与 images 一致：公开读、仅所有者写。

存储路径：`{userId}/doc_{timestamp}.{ext}`

### 新增表：user_attachments（统一元数据表）

记录所有附件（图片 + 文档）的元数据，`bucket` 字段区分来源 bucket。

```sql
create table user_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null,                -- 'images' 或 'attachments'
  storage_path text not null unique,    -- bucket 内的文件路径
  original_name text not null,          -- 原始文件名
  mime_type text not null,              -- MIME 类型
  size bigint not null,                 -- 文件大小（字节）
  description text,                     -- 用户自定义描述
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 索引
create index idx_user_attachments_user_id on user_attachments(user_id);
create index idx_user_attachments_created_at on user_attachments(user_id, created_at desc);

-- RLS
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

-- 触发器
create trigger set_updated_at
  before update on user_attachments
  for each row execute function update_updated_at();
```

### 回填现有图片数据

执行以下 SQL 将 `images` bucket 中已有的图片回填到 `user_attachments`：

```sql
insert into user_attachments (user_id, bucket, storage_path, original_name, mime_type, size, created_at)
select
  (storage.foldername(name))[1]::uuid as user_id,
  'images' as bucket,
  name as storage_path,
  name as original_name,
  coalesce(metadata->>'mimetype', 'image/jpeg') as mime_type,
  coalesce((metadata->>'size')::bigint, 0) as size,
  created_at
from storage.objects
where bucket_id = 'images'
  and name ~ '^[0-9a-f-]+/img_'
on conflict (storage_path) do nothing;
```

## Server Actions

**新建** `src/lib/actions/attachment-actions.ts`：

| 函数 | 用途 |
|------|------|
| `listUserAttachments(bucket?)` | 查询当前用户的 `user_attachments` 记录，可按 bucket 过滤（'images'/'attachments'），按时间倒序 |
| `uploadAttachment(formData)` | 上传文件到对应 bucket，创建 `user_attachments` 记录，返回 URL |
| `deleteAttachment(id)` | 删除 `user_attachments` 记录 + 删除 storage 文件 |
| `updateAttachmentDescription(id, description)` | 更新描述字段 |
| `replaceImage(file, storagePath)` | 上传裁剪后的图片覆盖原文件（同名上传），更新 `user_attachments.size` |

**修改** `src/lib/actions/image-actions.ts`：

- `uploadContentImage` 增加创建 `user_attachments` 记录的逻辑

## UI 设计

### 入口

在个人中心页面（`src/app/(blog)/profile/page.tsx`），「我的标签」section 之后新增「附件管理」section：

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

`AttachmentManagerButton` 是客户端组件，包含一个按钮 + 全屏 Dialog。
点击按钮弹出 `AttachmentDialog`，无需离开个人中心页面。

### 弹窗

全屏 Dialog（`sm:max-w-4xl`），内含两个 Tab：

```
┌─────────────────────────────────────────────┐
│  附件管理                          [关闭]    │
├─────────────────────────────────────────────┤
│  [图片]  [文档]                   [上传按钮] │
├─────────────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐                │
│  │ img1 │ │ img2 │ │ img3 │  ...           │
│  │ 120KB│ │ 85KB │ │ 2.1M │                │
│  └──────┘ └──────┘ └──────┘                │
│                                             │
│  或：                                      │
│  ┌─────────────────────────────────────┐   │
│  │  PDF   报告.pdf         2.3MB  编辑 │   │
│  │  DOCX  会议纪要.docx    156KB  编辑 │   │
│  │  XLSX  数据表.xlsx      1.8MB  编辑 │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**图片 Tab**：
- 缩略图网格（3-4 列）
- 每张图片显示文件大小
- 点击图片可查看大图
- 悬浮操作：删除、裁剪、编辑描述
- 点击裁剪弹出二级裁剪 Dialog（复用 react-easy-crop，自由比例）
- 裁剪后原地替换（同名文件覆盖上传）
- 编辑描述：inline 输入框，回车保存

**文档 Tab**：
- 列表形式（图标 + 文件名 + 大小 + 描述）
- 每行有「编辑描述」和「删除」按钮
- 编辑描述为 inline 输入框
- 文件类型图标：PDF 红色、Word 蓝色、Excel 绿色、PPT 橙色、其他灰色

### 新建组件

| 文件 | 用途 |
|------|------|
| `src/components/profile/attachment-manager-button.tsx` | 入口按钮 + Dialog 容器 |
| `src/components/profile/attachment-dialog.tsx` | 全屏 Dialog 主体（Tab 切换） |
| `src/components/profile/image-tab.tsx` | 图片网格 + 操作 + 描述编辑 |
| `src/components/profile/document-tab.tsx` | 文档列表 + 描述编辑 |
| `src/components/profile/image-crop-dialog.tsx` | 图片二次裁剪 |

## API 端点（REST）

新增 `POST /api/v1/attachments` 和 `DELETE /api/v1/attachments/:id`，MCP 同步新增工具。

## 涉及文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `supabase/init.sql` | 修改 | 新增 attachments bucket + user_attachments 表 + RLS + 回填 SQL |
| `src/lib/actions/attachment-actions.ts` | 新建 | 附件 CRUD Server Actions |
| `src/lib/actions/image-actions.ts` | 修改 | uploadContentImage 增加 user_attachments 记录 |
| `src/components/profile/attachment-manager-button.tsx` | 新建 | 入口按钮 + Dialog 容器 |
| `src/components/profile/attachment-dialog.tsx` | 新建 | 全屏 Dialog 主体 |
| `src/components/profile/image-tab.tsx` | 新建 | 图片管理 Tab |
| `src/components/profile/document-tab.tsx` | 新建 | 文档管理 Tab |
| `src/components/profile/image-crop-dialog.tsx` | 新建 | 图片二次裁剪 |
| `src/app/(blog)/profile/page.tsx` | 修改 | 新增附件管理 section |
| `src/app/api/v1/attachments/route.ts` | 新建 | REST API 端点 |
| `scripts/mcp-server.mjs` | 修改 | 新增附件相关工具 |
| `public/llms.txt` | 修改 | 更新 MCP 工具表 + API 表 |
| `public/api/v1/openapi.json` | 修改 | 新增端点定义 |
| `CLAUDE.md` | 修改 | 更新工具列表 + API 表 |
| `src/app/about/page.tsx` | 修改 | 更新功能特性 + 工具计数 |

## 验证

1. Supabase 执行 bucket + 表创建 SQL + 回填 SQL
2. 个人中心显示「附件管理」section，点击按钮弹出全屏 Dialog
3. 图片 Tab 显示已上传图片（含回填的），可删除、裁剪、编辑描述
4. 编辑图片描述，刷新后保持
5. 文档 Tab 上传 PDF/Word/Excel，显示在列表中
6. 编辑文档描述，刷新后保持
7. 删除文档，storage 中文件同步删除，user_attachments 记录同步删除
8. `npx tsc --noEmit` 类型检查通过
9. `npm run build` 构建通过
