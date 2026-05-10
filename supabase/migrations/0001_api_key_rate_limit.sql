-- API Key 限流字段迁移
-- 在 Supabase SQL Editor 中执行此脚本

-- 为 api_keys 表添加限流字段
alter table api_keys add column if not exists request_count integer not null default 0;
alter table api_keys add column if not exists window_start timestamptz;
