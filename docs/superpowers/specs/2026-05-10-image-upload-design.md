# 文章内插入图片功能设计

## Context

编辑器目前是纯 `<textarea>`，没有工具栏，用户需手动输入 `![alt](url)`。
需要支持：工具栏按钮上传图片、拖拽图片到编辑区上传，
图片上传到 Supabase Storage 后自动在光标处插入 `![图片](url)`。

客户端压缩到 1MB（使用 `browser-image-compression` 库）。

## 设计

### 1. Supabase Storage — images bucket

在 `supabase/init.sql` 中新增：

- Bucket: `images`，公开读取
- 文件大小限制: 2MB
- 允许类型: image/jpeg, image/png, image/webp
- 存储路径: `{userId}/img_{timestamp}.{ext}`
- RLS 策略与 covers 一致: 公开读、认证用户可上传/删除自己的文件

### 2. 上传 Action — image-actions.ts

新建 `src/lib/actions/image-actions.ts`：

- `uploadContentImage(formData)` — 接收 FormData（包含 file）
- 复用 `cover-actions.ts` 模式: auth 检查 → 类型校验 → 大小校验 → 上传 → 返回 getPublicUrl
- 返回 `{ imageUrl?: string; error?: string }`

### 3. 编辑器修改 — post-editor.tsx

修改 `src/components/blog/post-editor.tsx`：

1. **引入 browser-image-compression**：上传前压缩 `maxWidthOrHeight: 1920, maxSizeMB: 1`
2. **工具栏**：textarea 上方加一行工具栏，包含「图片」按钮，触发 `<input type="file" accept="image/*">`
3. **insertAtCursor**：在 textarea 光标位置插入 `![图片](${url})`，更新 content 状态
4. **拖拽上传**：textarea 加 `onDragOver`（虚线遮罩）和 `onDrop`（验证图片 → 压缩 → 上传 → 插入）
5. **两个 textarea**：内联和全屏 textarea 共享 `handleImageInsert` 函数
6. **上传状态**：上传中 toast "上传中..."，完成后 "已插入"，失败显示错误

## 涉及文件

| 文件                                  | 操作 | 说明                               |
| ------------------------------------- | ---- | ---------------------------------- |
| `supabase/init.sql`                   | 修改 | 新增 images bucket + RLS           |
| `src/lib/actions/image-actions.ts`    | 新建 | 图片上传服务端 Action              |
| `src/components/blog/post-editor.tsx` | 修改 | 工具栏按钮 + 拖拽 + insertAtCursor |

依赖: `browser-image-compression`（npm install）

## 验证

1. 在 Supabase 执行 bucket 创建 SQL
2. `npm i browser-image-compression`
3. `npm run dev` 启动开发服务器
4. 进入文章编辑页面，点击图片按钮选择文件上传
5. 拖拽图片文件到编辑区
6. 确认 markdown `![图片](url)` 正确插入到光标位置
7. 预览模式确认图片正常显示
8. `npx tsc --noEmit` 类型检查通过
