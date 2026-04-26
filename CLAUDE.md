# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

```bash
# Dev server (listens on all interfaces)
npm run dev

# Build
npm run build

# Lint
npm run lint

# Type check
npx tsc --noEmit
```

## Project Architecture

### Stack
- **Framework**: Next.js 16 (App Router), React 19
- **Database**: Supabase (PostgreSQL) with RLS
- **Auth**: Supabase Auth (PKCE flow) via `@supabase/ssr`
- **Styling**: Tailwind CSS v4 (CSS-based config, no tailwind.config.*), shadcn/ui (base-nova style)
- **Icons**: Lucide React

### Route Structure

- `(auth)/` — login, register, settings (protected)
- `(blog)/` — home (post list), posts/[slug] (detail), posts/new, posts-edit/[slug], my-posts
- `author/` — author list, author/[authorId] (profile + guestbook)
- `api/` — auth/callback, generate-summary, site-stats, my-ip

### Supabase Clients (src/lib/supabase/)

| File | Use Case |
|------|----------|
| `client.ts` | `createBrowserClient` — browser-side (client components) |
| `server.ts` | `createServerClient` — server components & server actions |
| `admin.ts` | Service role client — admin operations (list users, delete accounts) |
| `middleware.ts` | `updateSession()` — cookie management per request |

### Data Flow

1. **Reads**: Server components query Supabase directly, pass data as props to client components
2. **Mutations**: Server Actions (`'use server'` in `src/lib/actions/`) return `ActionResult = { error?: string }`
3. **Caching**: Public pages use `revalidate = 300`; `revalidatePath()` after mutations

### Key Patterns

- **Threaded comments/guestbook**: 2-level nesting built client-side from flat DB queries
- **Post likes**: Dual tracking (auth user by `user_id`, anonymous by `ip`) with unique constraints
- **Theme**: Context provider with light/dark/system, persisted via localStorage + cookie
- **Markdown**: `react-markdown` with remark-gfm, rehype-sanitize, rehype-highlight

### Database (supabase/schema.sql)

Tables: posts, post_likes, post_comments, comment_likes, user_settings, site_views, site_likes, guestbook_messages

Triggers: auto `updated_at`, auto-create `user_settings` on registration

RLS enabled on all tables — see schema.sql for per-table policies.

### Environment Variables

| Variable | Required | Scope |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Client+Server |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Client+Server |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server only |
| `NEXT_PUBLIC_SITE_TITLE` | Yes | Client+Server |
| `NEXT_PUBLIC_SITE_URL` | Yes | Client+Server |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | No | Client+Server |
| `OPENAI_API_KEY` | No | Server (summary gen) |
| `OPENAI_BASE_URL` | No | Server |
| `OPENAI_MODEL` | No | Server (default: gpt-4o-mini) |
