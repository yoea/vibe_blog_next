-- ============================================
-- Supabase Blog — 完整数据库初始化
-- ============================================
-- 在 Supabase Dashboard → SQL Editor 一次性执行

-- ============================================
-- Posts
-- ============================================
create table if not exists posts (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references auth.users(id) on delete cascade not null,
  title varchar(255) not null,
  slug varchar(255) unique not null,
  content text not null,
  excerpt text,
  published boolean default false,
  is_pinned boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- Post likes (authenticated + anonymous via IP)
-- ============================================
create table if not exists post_likes (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references posts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade,
  ip varchar(45),
  created_at timestamptz default now(),
  unique(post_id, user_id),
  unique(post_id, ip)
);

-- ============================================
-- Post comments (threaded, supports guests)
-- ============================================
create table if not exists post_comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references posts(id) on delete cascade not null,
  author_id uuid references auth.users(id) on delete cascade,
  author_email varchar(255),
  guest_name varchar(100),
  ip varchar(45),
  parent_id uuid references post_comments(id) on delete cascade,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- Comment likes
-- ============================================
create table if not exists comment_likes (
  id uuid default gen_random_uuid() primary key,
  comment_id uuid references post_comments(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade,
  ip varchar(45),
  created_at timestamptz default now(),
  unique(comment_id, user_id),
  unique(comment_id, ip)
);

-- ============================================
-- User settings (one row per user, created on signup)
-- ============================================
create table if not exists user_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade unique not null,
  display_name varchar(100),
  avatar_url text,
  github_id text,
  is_deleted boolean default false,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- GitHub ID 唯一索引（允许多个 NULL）
create unique index if not exists idx_user_settings_github_id
  on user_settings(github_id) where github_id is not null;

-- ============================================
-- Auto-save drafts (one draft per post)
-- ============================================
create table if not exists post_drafts (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references posts(id) on delete cascade unique not null,
  title varchar(255) not null default '',
  content text not null default '',
  excerpt text,
  updated_at timestamptz default now()
);

-- ============================================
-- Site views (anonymous page view tracking)
-- ============================================
create table if not exists site_views (
  id uuid default gen_random_uuid() primary key,
  ip varchar(45),
  accessed_at timestamptz default now()
);

-- ============================================
-- Site likes (anonymous site-wide like)
-- ============================================
create table if not exists site_likes (
  id uuid default gen_random_uuid() primary key,
  ip varchar(45),
  liked_at timestamptz default now()
);

-- ============================================
-- Guestbook messages (per-author threaded)
-- ============================================
create table if not exists guestbook_messages (
  id uuid default gen_random_uuid() primary key,
  to_author_id uuid references auth.users(id) on delete cascade not null,
  author_id uuid references auth.users(id) on delete cascade,
  author_email varchar(255),
  guest_name varchar(100),
  ip varchar(45),
  parent_id uuid references guestbook_messages(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- ============================================
-- Indexes
-- ============================================
create index if not exists idx_posts_author_id on posts(author_id);
create index if not exists idx_posts_published_created on posts(published, created_at desc);
create index if not exists idx_posts_slug on posts(slug);
create index if not exists idx_post_likes_post_id on post_likes(post_id);
create index if not exists idx_post_likes_ip on post_likes(ip);
create index if not exists idx_post_comments_post_id on post_comments(post_id);
create index if not exists idx_post_comments_parent_id on post_comments(parent_id);
create index if not exists idx_post_comments_ip on post_comments(ip);
create index if not exists idx_comment_likes_comment_id on comment_likes(comment_id);
create index if not exists idx_comment_likes_user_id on comment_likes(user_id);
create index if not exists idx_site_views_ip on site_views(ip);
-- ============================================
-- Post share clicks (per-post share tracking)
-- ============================================
create table if not exists post_shares (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references posts(id) on delete cascade not null,
  ip varchar(45),
  shared_at timestamptz default now()
);

create index if not exists idx_post_shares_post on post_shares(post_id);

-- ============================================
-- Full-text search (pg_trgm for Chinese/模糊搜索)
-- ============================================
create extension if not exists pg_trgm;
create index if not exists idx_posts_title_search on posts using gin (title gin_trgm_ops);
create index if not exists idx_posts_content_search on posts using gin (content gin_trgm_ops);

alter table post_shares enable row level security;
create policy "post_shares_insert" on post_shares for insert with check (true);
create policy "post_shares_select" on post_shares for select using (true);

create index if not exists idx_site_views_accessed on site_views(accessed_at);
create index if not exists idx_site_likes_ip on site_likes(ip);
create index if not exists idx_site_likes_liked on site_likes(liked_at);
create index if not exists idx_guestbook_to_author on guestbook_messages(to_author_id, created_at desc);
create index if not exists idx_guestbook_ip on guestbook_messages(ip);

-- ============================================
-- Tags (multi-tag support for posts)
-- ============================================
create table if not exists tags (
  id uuid default gen_random_uuid() primary key,
  name varchar(50) not null,
  slug varchar(100) unique not null,
  color varchar(7) default '#3B82F6',
  created_at timestamptz default now()
);

-- Add color column if upgrading from a previous version
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name = 'tags' and column_name = 'color') then
    alter table tags add column color varchar(7) default '#3B82F6';
  end if;
end $$;

-- Add created_by column if upgrading from a previous version
do $$ begin
  if not exists (select 1 from information_schema.columns where table_name = 'tags' and column_name = 'created_by') then
    alter table tags add column created_by uuid references auth.users(id) on delete set null;
  end if;
end $$;

create index if not exists idx_tags_created_by on tags(created_by);

create table if not exists post_tags (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references posts(id) on delete cascade not null,
  tag_id uuid references tags(id) on delete cascade not null,
  unique(post_id, tag_id)
);

create index if not exists idx_tags_slug on tags(slug);
create index if not exists idx_post_tags_post on post_tags(post_id);
create index if not exists idx_post_tags_tag on post_tags(tag_id);

alter table tags enable row level security;
alter table post_tags enable row level security;

create policy "tags_select" on tags for select using (true);
create policy "tags_insert" on tags for insert with check (
  auth.role() = 'authenticated' and created_by = auth.uid()
);
create policy "tags_delete" on tags for delete using (
  auth.uid() = created_by
);
create policy "post_tags_select" on post_tags for select using (true);
create policy "post_tags_insert" on post_tags for insert with check (
  auth.uid() = (select author_id from posts where id = post_id)
);
create policy "post_tags_delete" on post_tags for delete using (
  auth.uid() = (select author_id from posts where id = post_id)
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Posts
alter table posts enable row level security;

create policy "published_posts_select" on posts for select using (published = true);
create policy "own_posts_select" on posts for select using (auth.uid() = author_id);
create policy "authenticated_create_post" on posts for insert with check (auth.uid() = author_id);
create policy "own_posts_update" on posts for update using (auth.uid() = author_id);
create policy "own_posts_delete" on posts for delete using (auth.uid() = author_id);

-- Post likes
alter table post_likes enable row level security;

create policy "likes_select" on post_likes for select using (true);
create policy "authenticated_like" on post_likes for insert with check (
  auth.role() = 'authenticated' and auth.uid() = user_id
);
create policy "authenticated_unlike" on post_likes for delete using (
  auth.role() = 'authenticated' and auth.uid() = user_id
);
create policy "anonymous_like" on post_likes for insert with check (ip is not null);
create policy "anonymous_unlike" on post_likes for delete using (ip is not null);

-- Post comments
alter table post_comments enable row level security;

create policy "comments_select" on post_comments for select using (true);
create policy "authenticated_comment" on post_comments for insert with check (
  auth.role() = 'authenticated' and auth.uid() = author_id
);
create policy "guest_comment" on post_comments for insert with check (
  auth.role() = 'anon' and author_id is null and guest_name is not null
);
create policy "own_comment_update" on post_comments for update using (auth.uid() = author_id);
create policy "own_comment_delete" on post_comments for delete using (auth.uid() = author_id);
create policy "post_author_comment_delete" on post_comments for delete using (
  auth.uid() in (select p.author_id from posts p where p.id = post_id)
);

-- Comment likes
alter table comment_likes enable row level security;

create policy "comment_likes_select" on comment_likes for select using (true);
create policy "comment_likes_insert" on comment_likes for insert with check (
  auth.role() = 'authenticated' and auth.uid() = user_id
);
create policy "comment_likes_delete" on comment_likes for delete using (
  auth.role() = 'authenticated' and auth.uid() = user_id
);
create policy "comment_likes_anon_insert" on comment_likes for insert with check (ip is not null);
create policy "comment_likes_anon_delete" on comment_likes for delete using (ip is not null);

-- User settings
alter table user_settings enable row level security;

create policy "user_settings_select_public" on user_settings for select using (true);
create policy "own_settings_insert" on user_settings for insert with check (auth.uid() = user_id);
create policy "own_settings_update" on user_settings for update using (auth.uid() = user_id);

-- Post drafts
alter table post_drafts enable row level security;

create policy "own_drafts_select" on post_drafts for select
  using (auth.uid() = (select author_id from posts where id = post_id));
create policy "own_drafts_insert" on post_drafts for insert
  with check (auth.uid() = (select author_id from posts where id = post_id));
create policy "own_drafts_update" on post_drafts for update
  using (auth.uid() = (select author_id from posts where id = post_id));
create policy "own_drafts_delete" on post_drafts for delete
  using (auth.uid() = (select author_id from posts where id = post_id));

-- Site views
alter table site_views enable row level security;
create policy "site_views_insert" on site_views for insert with check (true);
create policy "site_views_select" on site_views for select using (true);

-- Site likes
alter table site_likes enable row level security;
create policy "site_likes_insert" on site_likes for insert with check (true);
create policy "site_likes_select" on site_likes for select using (true);

-- Guestbook
alter table guestbook_messages enable row level security;

do $$ begin
  create policy "guestbook_select" on guestbook_messages for select using (true);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "guestbook_insert" on guestbook_messages for insert with check (
    auth.role() = 'authenticated' and auth.uid() = author_id
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "guestbook_guest_insert" on guestbook_messages for insert with check (
    auth.role() = 'anon' and author_id is null and guest_name is not null
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "guestbook_delete" on guestbook_messages for delete using (
    auth.uid() = author_id or auth.uid() = to_author_id
  );
exception when duplicate_object then null;
end $$;

-- ============================================
-- Auto-update updated_at trigger
-- ============================================

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_posts_updated_at
  before update on posts for each row
  execute function update_updated_at_column();

create trigger update_comments_updated_at
  before update on post_comments for each row
  execute function update_updated_at_column();

create trigger update_user_settings_updated_at
  before update on user_settings for each row
  execute function update_updated_at_column();

create trigger update_post_drafts_updated_at
  before update on post_drafts for each row
  execute function update_updated_at_column();

-- ============================================
-- Auto-create user_settings on registration
-- ============================================

create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_settings (user_id, display_name, avatar_url, github_id)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'preferred_username',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    ),
    case
      when new.raw_user_meta_data ->> 'provider' = 'github'
        or new.raw_user_meta_data ->> 'iss' like '%github%'
      then new.raw_user_meta_data ->> 'sub'
      else null
    end
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- Avatar Storage Bucket & RLS
-- ============================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 20971520, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_owner_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.uid() = (storage.foldername(name))[1]::uuid
  );

create policy "avatars_owner_update"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.uid() = (storage.foldername(name))[1]::uuid
  );

create policy "avatars_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.uid() = (storage.foldername(name))[1]::uuid
  );

-- ============================================
-- Site Config（全局设置，单行）
-- ============================================

create table if not exists site_config (
  id int primary key default 1 check (id = 1),
  maintenance_mode boolean not null default false,
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table site_config enable row level security;

create policy "site_config_select"
  on site_config for select
  using (true);

insert into site_config (id) values (1) on conflict (id) do nothing;

create trigger update_site_config_updated_at
  before update on site_config
  for each row execute function update_updated_at_column();
