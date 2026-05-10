#!/usr/bin/env node

// MCP Server for 字里行间 Blog
// Usage: BLOG_API_URL=https://blog.example.com BLOG_API_KEY=ew-xxxx node scripts/mcp-server.mjs

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync } from 'node:fs';
import z from 'zod/v4';

const BLOG_API_URL = (process.env.BLOG_API_URL ?? '').replace(/\/+$/, '');
const BLOG_API_KEY = process.env.BLOG_API_KEY ?? '';

if (!BLOG_API_URL || !BLOG_API_KEY) {
  console.error('Missing BLOG_API_URL or BLOG_API_KEY environment variables');
  process.exit(1);
}

const BASE = `${BLOG_API_URL}/api/v1`;
const AUTH = { Authorization: `Bearer ${BLOG_API_KEY}` };

async function api(path, options = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...AUTH },
    ...options,
    // Don't override headers if body is FormData
    ...(options.body instanceof FormData ? { headers: { ...AUTH } } : {}),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(
      `[${res.status}] ${data.error || data.raw || 'Unknown error'}`,
    );
  }
  return data;
}

// ---- Build MCP Server ----

const pkg = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
);

const server = new McpServer({
  name: 'vibe-blog',
  version: pkg.version || '0.1.0',
  vendor: '字里行间 Blog MCP',
});

// ── whoami ──
server.tool(
  'whoami',
  '获取当前 API Key 对应的用户信息（邮箱、用户名、头像、是否为管理员等）',
  async () => {
    const data = await api('/whoami');
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  },
);

// ── list_posts ──
server.tool(
  'list_posts',
  '获取文章列表，支持分页',
  {
    page: z.number().int().min(1).default(1).describe('页码'),
    pageSize: z.number().int().min(1).max(50).default(10).describe('每页数量'),
  },
  async ({ page, pageSize }) => {
    const data = await api(`/posts?page=${page}&pageSize=${pageSize}`);
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  },
);

// ── get_post ──
server.tool(
  'get_post',
  '根据 slug 获取单篇文章的完整内容',
  {
    slug: z.string().describe('文章 slug（URL 中的标识符）'),
  },
  async ({ slug }) => {
    const data = await api(`/posts/${encodeURIComponent(slug)}`);
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    };
  },
);

// ── create_post ──
server.tool(
  'create_post',
  '创建一篇新文章。title 和 content 为必填。',
  {
    title: z.string().min(1).describe('文章标题'),
    content: z.string().min(1).describe('Markdown 正文'),
    excerpt: z.string().optional().describe('文章摘要'),
    published: z.boolean().default(true).describe('是否直接发布'),
    cover_image_url: z.string().url().optional().describe('封面图 URL'),
    tags: z.array(z.string()).optional().describe('标签名称列表'),
  },
  async ({ title, content, excerpt, published, cover_image_url, tags }) => {
    const data = await api('/posts', {
      method: 'POST',
      body: JSON.stringify({
        title,
        content,
        ...(excerpt && { excerpt }),
        ...(published !== undefined && { published }),
        ...(cover_image_url && { cover_image_url }),
        ...(tags && { tags }),
      }),
    });
    return {
      content: [
        {
          type: 'text',
          text: `文章创建成功！slug: ${data.data.slug}`,
        },
      ],
    };
  },
);

// ── update_post ──
server.tool(
  'update_post',
  '根据 slug 更新文章。只需传入要更新的字段。',
  {
    slug: z.string().describe('文章 slug'),
    title: z.string().optional().describe('新标题'),
    content: z.string().optional().describe('新的 Markdown 正文'),
    excerpt: z.string().optional().describe('新摘要'),
    published: z.boolean().optional().describe('是否发布'),
    cover_image_url: z.string().url().optional().describe('封面图 URL'),
  },
  async ({ slug, title, content, excerpt, published, cover_image_url }) => {
    const body = {};
    if (title !== undefined) body.title = title;
    if (content !== undefined) body.content = content;
    if (excerpt !== undefined) body.excerpt = excerpt;
    if (published !== undefined) body.published = published;
    if (cover_image_url !== undefined) body.cover_image_url = cover_image_url;
    await api(`/posts/${encodeURIComponent(slug)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return {
      content: [{ type: 'text', text: `文章 "${slug}" 已更新。` }],
    };
  },
);

// ── delete_post ──
server.tool(
  'delete_post',
  '根据 slug 删除文章，操作不可逆。',
  {
    slug: z.string().describe('文章 slug'),
  },
  async ({ slug }) => {
    await api(`/posts/${encodeURIComponent(slug)}`, { method: 'DELETE' });
    return {
      content: [{ type: 'text', text: `文章 "${slug}" 已删除。` }],
    };
  },
);

// ── archive_post ──
server.tool(
  'archive_post',
  '归档文章（移至归档表，可从归档恢复）',
  {
    slug: z.string().describe('文章 slug'),
  },
  async ({ slug }) => {
    await api(`/posts/${encodeURIComponent(slug)}/archive`, {
      method: 'POST',
    });
    return {
      content: [{ type: 'text', text: `文章 "${slug}" 已归档。` }],
    };
  },
);

// ── restore_post ──
server.tool(
  'restore_post',
  '取消归档，从归档表还原文章',
  {
    slug: z.string().describe('归档文章的 slug'),
  },
  async ({ slug }) => {
    await api(`/posts/${encodeURIComponent(slug)}/archive`, {
      method: 'DELETE',
    });
    return {
      content: [{ type: 'text', text: `文章 "${slug}" 已还原。` }],
    };
  },
);

// ── upload_cover ──
server.tool(
  'upload_cover',
  '为文章上传封面图。支持 JPG、PNG、WebP，最大 2MB。',
  {
    slug: z.string().describe('文章 slug'),
    imagePath: z.string().describe('本地图片文件路径（绝对路径）'),
  },
  async ({ slug, imagePath }) => {
    const file = readFileSync(imagePath);
    const ext = imagePath.split('.').pop()?.toLowerCase();
    const mimeMap = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };
    const mimeType = mimeMap[ext] || 'image/jpeg';
    const blob = new Blob([file], { type: mimeType });
    const formData = new FormData();
    formData.append('cover', blob, `cover.${ext}`);
    const data = await api(`/posts/${encodeURIComponent(slug)}/cover`, {
      method: 'POST',
      body: formData,
    });
    return {
      content: [
        {
          type: 'text',
          text: `封面上传成功！\n${JSON.stringify(data, null, 2)}`,
        },
      ],
    };
  },
);

// ── remove_cover ──
server.tool(
  'remove_cover',
  '移除文章封面图',
  {
    slug: z.string().describe('文章 slug'),
  },
  async ({ slug }) => {
    await api(`/posts/${encodeURIComponent(slug)}/cover`, {
      method: 'DELETE',
    });
    return {
      content: [{ type: 'text', text: `文章 "${slug}" 封面已移除。` }],
    };
  },
);

// ── add_comment ──
server.tool(
  'add_comment',
  '为文章添加评论',
  {
    slug: z.string().describe('文章 slug'),
    content: z.string().min(1).max(500).describe('评论内容'),
    author: z
      .string()
      .optional()
      .describe('显示名称（不传则使用 API key 用户）'),
    parentId: z.string().optional().describe('父评论 ID，用于回复'),
  },
  async ({ slug, content, author, parentId }) => {
    const body = { content };
    if (author) body.author = author;
    if (parentId) body.parentId = parentId;
    const data = await api(`/posts/${encodeURIComponent(slug)}/comments`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return {
      content: [
        {
          type: 'text',
          text: `评论已添加。\n${JSON.stringify(data, null, 2)}`,
        },
      ],
    };
  },
);

// ── delete_comment ──
server.tool(
  'delete_comment',
  '删除评论',
  {
    id: z.string().describe('评论 ID'),
  },
  async ({ id }) => {
    await api(`/comments/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return {
      content: [{ type: 'text', text: '评论已删除。' }],
    };
  },
);

// ── toggle_like ──
server.tool(
  'toggle_like',
  '切换文章点赞状态（已赞则取消，未赞则点赞）',
  {
    slug: z.string().describe('文章 slug'),
  },
  async ({ slug }) => {
    const data = await api(`/posts/${encodeURIComponent(slug)}/like`, {
      method: 'POST',
    });
    const liked = data.data?.liked ?? false;
    return {
      content: [{ type: 'text', text: liked ? '已点赞' : '已取消点赞' }],
    };
  },
);

// ── list_tags ──
server.tool('list_tags', '列出所有标签', async () => {
  const data = await api('/tags');
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
});

// ── create_tag ──
server.tool(
  'create_tag',
  '创建一个新标签',
  {
    name: z.string().min(1).max(50).describe('标签名称'),
    slug: z
      .string()
      .optional()
      .describe('自定义 slug（不传则按 name 自动生成）'),
    color: z
      .string()
      .optional()
      .describe('十六进制颜色值（如 #ff0000），不传则随机分配'),
  },
  async ({ name, slug, color }) => {
    const body = { name };
    if (slug) body.slug = slug;
    if (color) body.color = color;
    const data = await api('/tags', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return {
      content: [
        {
          type: 'text',
          text: `标签创建成功。\n${JSON.stringify(data, null, 2)}`,
        },
      ],
    };
  },
);

// ── delete_tag ──
server.tool(
  'delete_tag',
  '删除标签（会从所有文章中移除该标签）',
  {
    id: z.string().describe('标签 ID'),
  },
  async ({ id }) => {
    await api(`/tags/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return {
      content: [{ type: 'text', text: '标签已删除。' }],
    };
  },
);

// ── Start ──
const transport = new StdioServerTransport();
await server.connect(transport);

// StdioServerTransport 通过 stderr 输出日志是安全的，stdout 被 MCP 协议占用
console.error(`Vibe Blog MCP server started — API: ${BLOG_API_URL}`);
