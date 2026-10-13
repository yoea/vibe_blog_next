# 迁移可行性分析：Supabase → 自有服务器 + 原生 PostgreSQL + 阿里云 OSS

> 评估日期：2026-10-12 ｜ 基准版本：v0.14.2 (`7869bdf`)
> 本文仅做评估与方案设计，**未修改任何代码**。
> 所有数字来自对当前工作区代码的静态扫描（`grep` / 逐文件阅读），不是估算。

---

## 0. 结论先行

**技术上 100% 可迁移，没有不可逾越的障碍。** 原因是本项目恰好避开了 Supabase 最难迁移的两项能力：

- **未使用 Realtime**（全仓无 `.channel()` / `postgres_changes` 调用）
- **未使用 Edge Functions**（无 `supabase/functions` 目录）

**但"值得与否"取决于动机，不是技术**：

| 你的真实动机 | 我的建议 |
| --- | --- |
| 省成本、摆脱 Free Tier 冷启动、数据自主可控 | **方案 A：Supabase 自托管**。1–3 人天，代码零改动。别重写。 |
| 彻底去 Supabase 依赖（国产化 / 交付客户 / 长期技术债） | **方案 C：全量重构**。45–70 人天，必须分 4 阶段，不可一步到位。 |
| 既要去依赖，又扛不动 45 人天 | **方案 B：保留 PostgREST，只换 PG + 存储**。10–15 人天，性价比最高。**这是我最推荐的中庸解。** |

**一句话判断**：如果只为了省钱和可控，**不要重写**。重写 60 人天换来的东西，自托管方案 2 人天就能拿到 90%。

---

## 1. 当前实际依赖的 Supabase 能力清单

不看文档写什么，看代码实际调用了什么。

### 1.1 能力使用矩阵

| Supabase 能力 | 是否使用 | 代码证据 | 迁移难度 |
| --- | --- | --- | --- |
| **PostgreSQL 数据库** | ✅ 重度 | 15 张表，263 处 `.from()` 查询 | 中 — 表结构与 PG 完全兼容 |
| **Auth (GoTrue)** | ✅ 重度 | 邮箱登录/注册、JWT session、GitHub OAuth、`linkIdentity`/`unlinkIdentity`、密码修改、账号注销 | **高 — 全项目最大难点** |
| **Storage** | ✅ 中度 | 4 个 bucket（avatars/covers/images/attachments），7 处 upload、8 处 getPublicUrl、4 处 remove | 低 — 调用点集中且都在服务端 |
| **RLS 行级安全** | ✅ 重度 | **73 条 `create policy`**，覆盖 16 张表，`auth.uid()` 出现 49 次、`auth.role()` 9 次 | **高 — 但可平滑承接，见 §3.3** |
| **PostgREST（supabase-js 底层）** | ✅ 隐式 | `supabase.from(...).select('*, author:user_settings(...)')` 嵌入式 join | 中 — 若换 ORM 需全部手写 join |
| **Realtime** | ❌ 未使用 | 无任何 channel 订阅 | 无成本 |
| **Edge Functions** | ❌ 未使用 | 无 `supabase/functions` 目录 | 无成本 |
| **Supavisor 连接池** | ❌ 未使用 | 应用层无感知 | 无成本 |
| Storage 图片变换（imgproxy） | ❌ 未使用 | 图片由 `browser-image-compression` 在浏览器端压缩 | 无成本 |
| Vault / pg_cron / 其他扩展 | ❌ 未使用 | 仅用 `pg_trgm`（全文索引） | 低 — 原生 PG 自带 |

### 1.2 关键利好：浏览器从不直连数据库

`src/lib/supabase/client.ts`（浏览器客户端）只有 **7 个** 文件引用，且全部只做**认证会话**操作：

```
command-palette.tsx    auth.getSession()
header.tsx             auth.getSession() / auth.onAuthStateChange()
login-toast.tsx        auth.onAuthStateChange()
login-form.tsx         signInWithPassword / signInWithOAuth
register-form.tsx      signUp
profile-info-card.tsx  linkIdentity / unlinkIdentity
account-security       signInWithPassword / updateUser
```

**没有任何一处浏览器端 `.from()` 数据查询。** 所有数据读写都在服务端：`lib/db/queries.ts`（1142 行）+ 17 个 actions + 12 个 `api/v1` route handler。

这意味着：换掉数据库访问方式时，React 组件层基本不用动，改动被锁在数据层内。这是本项目最大的迁移红利。

### 1.3 关键坏消息：15 张表的外键全部指向 `auth.users`

`init.sql` 中 `references auth.users(id)` 出现 **15 次**，覆盖 posts / post_likes / post_comments / user_settings / guestbook_messages / tags / user_attachments / site_config / api_keys / notifications / articles_archive。

**这一步替代不了，只能替换。** 自建认证后必须：

1. 新建自建 `users` 表
2. 把 15 处外键重定向到新表
3. 重建 `on_auth_user_created` 触发器（当前依赖 Supabase 专有的 `raw_user_meta_data` JSONB 字段解析 GitHub 身份）

### 1.4 迁移附带发现：一个现存的越权漏洞（与迁移强相关）

> **这不是迁移动作导致的，是当前线上就存在的 Bug，但会直接改变迁移方案的安全论证。**

`src/app/api/v1/posts/[slug]/route.ts` 的 **PUT / DELETE** 使用 `createAdminClient()`（Service Role，**bypass 所有 RLS**），但代码里没有任何 `author_id` 校验：

```typescript
// L44-71  PUT /api/v1/posts/:slug
const { data: existing } = await supabase.from('posts').select('id').eq('slug', slug)...
await supabase.from('posts').update(updates).eq('id', existing.id);   // ← 无 author_id 断言

// L104-120  DELETE /api/v1/posts/:slug
await supabase.from('posts').delete().eq('id', post.id);              // ← 无 author_id 断言
```

**后果：任何持有有效 API Key 的用户，可以修改或删除全站任何人的文章。**

对比之下 `POST /api/v1/posts` 和 `/comments` 都正确传了 `userId` —— 说明这是**遗漏而非设计**。

**对迁移的意义**：这削弱了"RLS 是安全基石、去掉 RLS 就不安全"的论点。REST API 路径从设计上就没依赖 RLS。迁移到应用层鉴权时，**正好把这个漏洞一并补掉**。建议在任何阶段之前先修（改动量：加 2 个 `.eq('author_id', userId)` + 404 响应，约 20 分钟）。

### 1.5 各能力的替代方案

| 能力 | 替代方案 | 说明 |
| --- | --- | --- |
| PostgreSQL | 自建 PostgreSQL 16/17 + PgBouncer | `pg_trgm` 原生自带；`gen_random_uuid()` PG13+ 内置 |
| Auth (GoTrue) | **Auth.js v5 (NextAuth)** 或 Lucia/Jose 自签 JWT | Auth.js 与 Next App Router 契合度最高；需自建 users 表 |
| GitHub OAuth | Auth.js GitHub Provider | 需重写 `identity` 关联逻辑（当前 `linkIdentity` 由 Supabase 托管） |
| Storage | 阿里云 OSS SDK (`ali-oss`) | 服务端直传，浏览器侧经 Server Action，无需暴露 AccessKey |
| PostgREST | **Drizzle ORM** 或 `postgres.js` | Drizzle 类型安全，可复用现有 TS 类型；但嵌入式 join 要手写 |
| RLS | **原生 PostgreSQL RLS 保留**（换 uid 取值函数） | 见 §3.3，这是最优解，不是重写应用层鉴权 |
| 会话 cookie | 自建 httpOnly JWT cookie | `@supabase/ssr` 的 cookie 管理逻辑可 1:1 复刻（约 60 行） |

---

## 2. 重构成本估算

### 2.1 改动规模（实测数据）

| 指标 | 数值 | 口径 |
| --- | --- | --- |
| 引用 supabase 的文件 | 71 个 | `grep -rl supabase src/ scripts/` |
| `.from()` 查询调用点 | 263 处 | 分布在 queries / actions / api/v1 |
| Server Actions 文件 | 17 个 | `src/lib/actions/*.ts` |
| REST Route Handler | 12 个 | `src/app/api/v1/**` |
| 数据表 | 15 张 | init.sql |
| RLS 策略 | 73 条 | 含 storage.objects 的 16 条 |
| `auth.uid()` 依赖点 | 49 处 | RLS 策略内 |
| `auth.users` 外键 | 15 处 | schema 层 |
| Storage upload 点 | 7 处 | avatar / cover / image / attachment |
| `getPublicUrl` 点 | 8 处 | URL 构造逻辑 |
| Storage remove 点 | 4 处 | 删除联动 |
| 硬编码 Supabase URL | **1 处** | `cover-image-uploader.tsx:176` |

### 2.2 最大的两个重写放大器

**放大器一：supabase-js 的嵌入式 join**

当前大量查询形如 `.select('*, author:user_settings(display_name, avatar_url), tags:post_tags(...)')`，PostgREST 一行返回嵌套结构。换成 SQL/ORM 后必须手写 join + 结果重塑 + 类型转换。这是纯苦力活，`getPostBySlug` 和 `getCommentsForPost` 这两个函数最痛。

**放大器二：`auth.users` 外键重定向**

15 张表的外键 + `on_auth_user_created` 触发器 + Admin 删除用户链路（`admin.auth.admin.deleteUser`）。这是手术级改动，必须停机或双写。

### 2.3 工作量估算（单人、含自测）

| 方案 | 认证 | 数据层 | RLS/鉴权 | 存储 | 测试/切换 | **合计** |
| --- | --- | --- | --- | --- | --- | --- |
| **A. Supabase 自托管** | 0 | 0 | 0 | 0（保留 Storage） | 1 人天 | **1–3 人天** |
| **B. 保留 PostgREST，换 PG + OSS** | 2 人天（仅换 key/JWT 签发） | 1 人天 | 1 人天 | 4 人天 | 3 人天 | **10–15 人天** |
| **C. 全量重构（Drizzle + 自建 Auth + OSS）** | 12–15 人天 | 15–25 人天 | 6–10 人天 | 3–5 人天 | 8–12 人天 | **45–70 人天** |

> 估算按熟练 Next.js + PostgreSQL 工程师计。若含 AI Agent 辅助，`queries.ts` 的机械改写可压缩 30–40%，但认证部分压不动。

### 2.4 风险矩阵

| 风险 | 等级 | 说明与缓解 |
| --- | --- | --- |
| 全体用户强制重新登录 | 🔴 高 | Supabase 签发的 JWT 无法被自建方案验签。缓解：换 Auth 必须停机发公告 + 邮件引导。**无法避免。** |
| 密码哈希不兼容 | 🔴 高 | GoTrue 用 bcrypt，导出哈希为 `$2a$` 格式。若自建也用 bcrypt 可直接复用；否则**全员重置密码**。缓解：Auth.js Credentials Provider 用 `bcrypt.compare` 兼容。 |
| RLS 翻译错误导致越权或误拦截 | 🔴 高 | 73 条策略逐条验证成本极高。缓解：§3.3 的保留 RLS 方案（只改 uid 取值），或直接应用层校验。**不要两者混用，会出现逻辑分裂。** |
| GitHub OAuth identity 关联丢失 | 🟡 中 | `linkIdentity`/`unlinkIdentity` 需自建 identities 表处理。缓解：先下线这两个入口。 |
| 历史图片 URL 失效 | 🟡 中 | `posts.cover_image_url`、`user_attachments.storage_path` 存的是绝对 URL。缓解见 §3.2。 |
| `next/image` remotePatterns 漏配 | 🟢 低 | `next.config.ts` 需加 OSS 域名。漏了只是图片不显示，不影响功能。 |
| 冷启动问题迁移后发现没解决 | 🟡 中 | Supabase Free Tier 冷启动的另一半原因是 Supabase 侧；但也可能是 Next ISR 未命中。建议先打点确认瓶颈到底在哪侧。 |

---

## 3. 迁移路径与关键步骤

### 3.0 阶段 0：止血 + 收敛（无论选哪个方案都应该做）

**目标**：把迁移风险从"散落在 71 个文件"收敛到"集中在 1 个文件"。

1. **先修越权漏洞**（`src/app/api/v1/posts/[slug]/route.ts` PUT/DELETE 补 `author_id` 断言）
2. 定义仓储接口层：所有页面/组件只依赖 `@/lib/db` 导出的函数，**禁止任何组件/route 直接使用 `supabase.from()`**
3. 全部 263 处 `.from()` 收敛进 `queries.ts` + actions

**关键**：这个阶段**不换任何技术栈**，纯移动代码。完成后，`queries.ts` 内部实现怎么换，上层都无感。
**工作量**：3–5 人天。这是所有后续阶段的**强制前置**。

### 3.1 阶段 1：存储换阿里云 OSS（收益最快，风险最低）

优先做存储，因为它与认证、数据库完全正交。

1. 抽 `StorageAdapter` 接口：`upload(file, opts) / getPublicUrl(path) / remove(paths)`
2. 实现 `SupabaseStorageAdapter`（保留现有逻辑）与 `OssStorageAdapter`（`ali-oss` 服务端 SDK）
3. 环境变量开关 `STORAGE_DRIVER=supabase|oss`，支持灰度回切
4. **历史文件搬迁**：脚本遍历 4 个 bucket → 下载 → 按原路径结构上传到 OSS
5. **URL 回填**：批量 UPDATE `posts.cover_image_url`、`user_attachments.storage_path`、`user_settings.avatar_url`
6. **必须改的硬编码**：`src/components/blog/cover-image-uploader.tsx:176` 的 `.supabase.co/storage/v1/object/public/` 判断要改为通用判定
7. `next.config.ts` 的 `remotePatterns` 增加 OSS 域名
8. 建议上线后**保留 30 天反向代理**，旧 Supabase URL 302 到 OSS URL，避免 CDN/搜索引擎缓存的死链

**工作量**：3–5 人天。**风险**：低，可灰度、可回切。

### 3.2 阶段 2：认证体系替换（最难，务必单独一个阶段）

**为什么单独做**：15 张表的外键指向 `auth.users`，这是全系统数据完整性的根。动了它，等于换地基。

步骤：

1. 自建 `users` 表（id uuid, email, password_hash, email_verified, created_at）+ `oauth_identities` 表（provider, provider_user_id, user_id）
2. 引入 **Auth.js v5**，Credentials Provider 用 `bcrypt.compare` 校验从 Supabase 导出的哈希 → **用户无需重置密码**
3. GitHub Provider 重建 OAuth 流程，`/api/auth/callback` route 改写
4. 复刻会话机制：`@supabase/ssr` 的 cookie 管理换成 Auth.js 的 `getServerSession`，`src/proxy.ts` 里的拦截逻辑同步替换
5. **外键重定向**：`references users(id)` × 15 —— 这是迁移窗口的核心操作
6. 重写注册触发器：把依赖 `raw_user_meta_data` 的 `handle_new_user` 改成应用层在创建用户时插入 `user_settings`
7. `queries.ts:638` 处 `admin.auth.admin.getUserById()` 批量取邮箱，改为直接 JOIN `users` 表（顺手解决了 N+1 性能问题）

**会话切换**：必须接受**全体用户重新登录**。这是物理限制，不是工程能力问题。

**工作量**：12–15 人天。

### 3.3 阶段 3：数据访问层 + RLS 承接

**这里有个反直觉的关键决策：不要删 RLS，PostgreSQL 原生就支持 RLS。**

`auth.uid()` 本质是 Supabase 提供的便捷函数（从 JWT claim 取 `sub`）。原生 PG 完全可以用同一套策略，只把取值方式换成 session 变量：

```sql
-- 替代 auth.uid()
create function app.current_user_id() returns uuid as $$
  select nullif(current_setting('app.user_id', true), '')::uuid;
$$ language sql stable;

-- 替代 auth.role() = 'anon'
create function app.current_role() returns text as $$
  select coalesce(nullif(current_setting('app.user_role', true), ''), 'anon');
$$ language sql stable;
```

连接时注入：

```sql
begin;
set local app.user_id = '<uuid>';
set local app.user_role = 'authenticated';
-- 业务查询
commit;
```

**收益**：73 条策略的**逻辑结构一行不用改**，只做 `sed` 级替换 `auth.uid()` → `app.current_user_id()`、`auth.role()` → `app.current_role()`。这是把 RLS 迁移风险从「高」降到「中」的关键。

替代方案（不推荐）是把 RLS 全部翻译成应用层 `if (userId !== post.author_id) throw` —— 263 个查询点逐个确认上下文，人犯错概率极高，且一旦漏一处就是越权。

**注意**：这条路径要求每个请求都在事务中设置 session 变量，连接池必须避免租借串号（PgBouncer 用 transaction pooling 而非 session pooling，或用 `SET LOCAL`）。

数据访问层本体：

- 选 **Drizzle ORM**（类型安全、schema 可与现有 TS interface 共存）或 `postgres.js`（更贴近手写 SQL）
- 263 处 `.from()` 逐个改写，**重点攻坚** `getPostBySlug`、`getCommentsForPost`、`getGuestbookMessages` 这三个最复杂的嵌套 join
- `revalidatePath` 调用点保持不变，ISR 策略不受影响

**工作量**：21–35 人天（含 RLS 翻译与逐条验证）。

---

## 4. 分阶段落地顺序推荐

```
阶段 0 (3-5d)   阶段 1 (3-5d)    阶段 2 (12-15d)    阶段 3 (21-35d)
┌──────────┐   ┌──────────┐    ┌──────────┐      ┌──────────┐
│ 修越权洞 │ → │ 存储换   │ → │ 认证换   │ →   │ 数据层换 │
│ 收敛仓储 │   │ OSS      │   │ Auth.js  │     │ Drizzle  │
│ 零技术栈 │   │ 可灰度   │   │ 外键重定向│     │ RLS承接  │
│ 变更     │   │ 可回切   │   │ 需重登录 │     │          │
└──────────┘   └──────────┘    └──────────┘      └──────────┘
   必做          先做=早收益      不可逆          最后做
```

**为什么这个顺序**：

1. **阶段 0 必做**：不收敛就动技术栈，等于 71 个文件同时出错，无法定位。
2. **存储先做**：唯一可以灰度回滚的改造，能最早验证"去 Supabase"的收益和风险模型，团队建立信心。
3. **认证居中**：它依赖数据库 schema 已稳定，但它又是数据层替换的前提（外键必须指向新 users 表）。
4. **数据层最后**：改动量最大、最机械，前面的不确定性清空后再做，返工率最低。

每个阶段结束都必须：
- `npm run lint` → `npx tsc --noEmit` → `npm run build` 三连通过
- 生产环境双跑 3–7 天再切流量
- **不要在同一次发布里混合两个阶段**

---

## 5. 关键假设与不确定因素

以下结论依赖这些未经实测的前提，**动手前必须先验证**：

| # | 假设 | 为什么重要 | 如何验证 |
| --- | --- | --- | --- |
| 1 | **生产数据量未知**（文章数、用户数、OSS 搬迁体积） | 直接决定迁移窗口是 10 分钟还是 10 小时。用户少则「强制重登录」可接受度高 | 查 Supabase Dashboard 的 Database size / Storage size |
| 2 | `.env.local` 内容未读取 | 无法确认是否还接了别的 Supabase 服务（如 Vault） | 你本地看一眼即可，我刻意没读凭据 |
| 3 | **生产峰值 QPS 未知** | 决定是否需要 PgBouncer、连接池规模 | 查 PM2 日志 / nginx access log |
| 4 | Supabase Dashboard 里是否有手工创建的对象（不在 init.sql 中） | init.sql 是 IaaS 化的最佳情况。若 Dashboard 手改过，外键重定向时会踩雷 | 对比 Dashboard 表结构与 init.sql 差异 |
| 5 | 冷启动瓶颈位置未定位 | 如果瓶颈在 Next.js 侧，**迁移 Supabase 治不好病** | 加服务端计时埋点，区分 Supabase RT 与 Next RT |
| 6 | 「香港/中国/getify Supabase 项目」的区域未确认 | 影响 OSS 同地域选型与延迟 | 查 Supabase 项目设置 |
| 7 | 「确保假定阿里云 OSS 与 Next 服务同地域或可接受跨地域流量费」 | 跨地域回源成本可能吃掉省下的钱 | 选同地域 bucket 即可规避 |
| 8 | 估算未含部署管线改造（deploy-local.mjs / deploy-remote.sh / PM2） | 环境变量、健康检查、pm2 ecosystem 都要同步改 | 需要另角度看 scripts/ |

---

## 附：不做的事（明确排除）

- ❌ **不要一次性全量重写**。60 人天级别的改动没有回头路。
- ❌ **不要在保留 Supabase Auth 的同时替换数据层**。JWT 里的 `sub` 是 `auth.users` 的主键，两边必须同时切。
- ❌ **不要混用 RLS 与应用层鉴权**。两套判据会分裂，且互相掩盖错误。
- ✅ **阶段 0 的越权修复与所有方案正交**，现在就该做。
