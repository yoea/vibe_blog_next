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
  console.error(
    'Error: BLOG_API_URL and BLOG_API_KEY environment variables are required.\n' +
      'Example: BLOG_API_URL=https://blog.example.com BLOG_API_KEY=ew-xxxx node scripts/mcp-server.mjs\n' +
      'API keys are generated in the blog settings page (设置 → 本站API KEY → 生成密钥).',
  );
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
    // Return structured error instead of throwing — agents can see the error_code
    return {
      error: true,
      status: res.status,
      error_code: data.error_code || 'UNKNOWN',
      message: data.error || data.raw || 'Unknown error',
    };
  }
  return data;
}

// ---- Build MCP Server ----

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);

const server = new McpServer({
  name: 'vibe-blog',
  version: pkg.version || '0.1.0',
});

// Helper: format error result for MCP
function formatResult(data, successMsg) {
  if (data?.error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error [${data.error_code}]: ${data.message}`,
        },
      ],
      isError: true,
    };
  }
  return {
    content: [
      { type: 'text', text: successMsg || JSON.stringify(data, null, 2) },
    ],
  };
}

// ── whoami ──
server.registerTool(
  'whoami',
  {
    description:
      'Verify your API key and get the current user info (email, display name, avatar, admin status). ' +
      'Call this first to confirm authentication is working before using other tools.',
    inputSchema: undefined,
  },
  async () => {
    const data = await api('/whoami');
    return formatResult(data);
  },
);

// ── list_posts ──
server.registerTool(
  'list_posts',
  {
    description:
      'List blog posts with pagination. Returns post titles, slugs, excerpts, cover images, tags, like/comment counts, and publish dates. ' +
      'Use the slug from results to call get_post, update_post, delete_post, etc. ' +
      'Default page size is 10, max 50.',
    inputSchema: {
      page: z
        .number()
        .int()
        .min(1)
        .default(1)
        .describe('Page number (starts from 1)'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(10)
        .describe('Number of posts per page (1-50)'),
    },
  },
  async ({ page, pageSize }) => {
    const data = await api(`/posts?page=${page}&pageSize=${pageSize}`);
    return formatResult(data);
  },
);

// ── get_post ──
server.registerTool(
  'get_post',
  {
    description:
      'Get the full content of a single post by its slug. Returns title, markdown content, excerpt, cover image URL, tags, like count, comments, and metadata. ' +
      'Use list_posts first to discover available slugs.',
    inputSchema: {
      slug: z
        .string()
        .describe(
          'Post slug (the URL-friendly identifier, e.g. "my-first-post")',
        ),
    },
  },
  async ({ slug }) => {
    const data = await api(`/posts/${encodeURIComponent(slug)}`);
    return formatResult(data);
  },
);

// ── create_post ──
server.registerTool(
  'create_post',
  {
    description:
      'Create and publish a new blog post. The post appears on the homepage immediately if published=true (default). ' +
      'You MUST provide title and content. You SHOULD also provide excerpt and tags — do not leave them empty. ' +
      'Auto-generate excerpt and tags from the content if the user does not specify them. ' +
      'The system appends an AI attribution footer to content automatically — do not add one yourself.',
    inputSchema: {
      title: z
        .string()
        .min(1)
        .describe(
          'Post title (required). Write a concise, engaging title that summarizes the topic.',
        ),
      content: z
        .string()
        .min(1)
        .describe(
          'Post body in Markdown format (required). Use headings, lists, code blocks, links etc. as appropriate. ' +
            'Do NOT add an AI attribution footer — the system adds it automatically.',
        ),
      excerpt: z
        .string()
        .max(140)
        .optional()
        .describe(
          'Summary shown in post cards and search results. Max 140 characters. ' +
            'Auto-generate from content if the user does not provide one — write a concise summary of the key points.',
        ),
      published: z
        .boolean()
        .default(true)
        .describe('Set true to publish immediately, false to save as draft'),
      cover_image_url: z
        .string()
        .url()
        .optional()
        .describe(
          'Direct URL to cover image. Use upload_cover tool if you only have a local file.',
        ),
      tags: z
        .array(z.string())
        .optional()
        .describe(
          'Tag names for categorization. Auto-generate 2–7 relevant tags if the user does not specify. ' +
            'Each tag: 2–6 Chinese characters OR 1–2 English words (e.g. "JavaScript", "机器学习", "React"). ' +
            'Tags that do not yet exist will be created automatically with random colors.',
        ),
    },
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
    if (data?.error) return formatResult(data);
    const slug = data.data?.slug;
    return {
      content: [
        {
          type: 'text',
          text:
            `Post created successfully!\n` +
            `Slug: ${slug}\n` +
            `URL: ${BLOG_API_URL}/posts/${slug}\n` +
            `Published: ${published !== false}\n\n` +
            `Next steps:\n` +
            `- Use upload_cover to add a cover image\n` +
            `- Use update_post to edit content or add tags`,
        },
      ],
    };
  },
);

// ── update_post ──
server.registerTool(
  'update_post',
  {
    description:
      'Update an existing post. Only pass the fields you want to change — omitted fields keep their current values. ' +
      'Use get_post first to see current values. ' +
      'The slug identifies which post to update (get it from list_posts or create_post).',
    inputSchema: {
      slug: z
        .string()
        .describe('Post slug to update (from list_posts or create_post)'),
      title: z.string().optional().describe('New title'),
      content: z
        .string()
        .optional()
        .describe('New Markdown content (replaces entire body)'),
      excerpt: z
        .string()
        .max(140)
        .optional()
        .describe(
          'New excerpt/summary (max 140 chars). Auto-generate from content if updating content but not providing excerpt.',
        ),
      published: z
        .boolean()
        .optional()
        .describe('Change publish status (true=published, false=draft)'),
      cover_image_url: z
        .string()
        .url()
        .optional()
        .describe('New cover image URL (use upload_cover for local files)'),
      tags: z
        .array(z.string())
        .optional()
        .describe(
          'Replace all tags. 2–7 tags, each 2–6 Chinese chars or 1–2 English words. New tags are created automatically.',
        ),
    },
  },
  async ({
    slug,
    title,
    content,
    excerpt,
    published,
    cover_image_url,
    tags,
  }) => {
    const body = {};
    if (title !== undefined) body.title = title;
    if (content !== undefined) body.content = content;
    if (excerpt !== undefined) body.excerpt = excerpt;
    if (published !== undefined) body.published = published;
    if (cover_image_url !== undefined) body.cover_image_url = cover_image_url;
    if (tags !== undefined) body.tags = tags;
    const data = await api(`/posts/${encodeURIComponent(slug)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    if (data?.error) return formatResult(data);
    return {
      content: [
        {
          type: 'text',
          text: `Post "${slug}" updated successfully. URL: ${BLOG_API_URL}/posts/${slug}`,
        },
      ],
    };
  },
);

// ── delete_post ──
server.registerTool(
  'delete_post',
  {
    description:
      'Permanently delete a post by slug. This action cannot be undone. ' +
      'Consider using archive_post instead if you may need the post later.',
    inputSchema: {
      slug: z.string().describe('Post slug to delete'),
    },
  },
  async ({ slug }) => {
    const data = await api(`/posts/${encodeURIComponent(slug)}`, {
      method: 'DELETE',
    });
    if (data?.error) return formatResult(data);
    return {
      content: [{ type: 'text', text: `Post "${slug}" has been deleted.` }],
    };
  },
);

// ── archive_post ──
server.registerTool(
  'archive_post',
  {
    description:
      'Archive a post (move to archive table). Archived posts are hidden from the main blog but can be restored later with restore_post. ' +
      'This is safer than delete — prefer archiving unless you truly want permanent removal.',
    inputSchema: {
      slug: z.string().describe('Post slug to archive'),
    },
  },
  async ({ slug }) => {
    const data = await api(`/posts/${encodeURIComponent(slug)}/archive`, {
      method: 'POST',
    });
    if (data?.error) return formatResult(data);
    return {
      content: [
        {
          type: 'text',
          text: `Post "${slug}" archived. Use restore_post to bring it back.`,
        },
      ],
    };
  },
);

// ── restore_post ──
server.registerTool(
  'restore_post',
  {
    description:
      'Restore an archived post back to the main blog. The post will reappear on the homepage and in post listings.',
    inputSchema: {
      slug: z.string().describe('Slug of the archived post to restore'),
    },
  },
  async ({ slug }) => {
    const data = await api(`/posts/${encodeURIComponent(slug)}/archive`, {
      method: 'DELETE',
    });
    if (data?.error) return formatResult(data);
    return {
      content: [
        {
          type: 'text',
          text: `Post "${slug}" restored. URL: ${BLOG_API_URL}/posts/${slug}`,
        },
      ],
    };
  },
);

// ── upload_cover ──
server.registerTool(
  'upload_cover',
  {
    description:
      'Upload a local image file as the cover image for a post. ' +
      'Accepts JPG, PNG, WebP formats. Maximum file size: 2MB. ' +
      'The image will be cropped to 16:9 aspect ratio. ' +
      'imagePath must be an absolute path to the image file on the local filesystem.',
    inputSchema: {
      slug: z.string().describe('Post slug to attach the cover image to'),
      imagePath: z
        .string()
        .describe(
          'Absolute path to the local image file (e.g. "/home/user/photo.jpg" or "C:\\Users\\photo.jpg")',
        ),
    },
  },
  async ({ slug, imagePath }) => {
    let file;
    try {
      file = readFileSync(imagePath);
    } catch (err) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Cannot read file "${imagePath}" — ${err.message}. Make sure the path is absolute and the file exists.`,
          },
        ],
        isError: true,
      };
    }
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
    if (data?.error) return formatResult(data);
    return {
      content: [
        {
          type: 'text',
          text: `Cover image uploaded for "${slug}".`,
        },
      ],
    };
  },
);

// ── remove_cover ──
server.registerTool(
  'remove_cover',
  {
    description: 'Remove the cover image from a post.',
    inputSchema: {
      slug: z.string().describe('Post slug to remove the cover image from'),
    },
  },
  async ({ slug }) => {
    const data = await api(`/posts/${encodeURIComponent(slug)}/cover`, {
      method: 'DELETE',
    });
    if (data?.error) return formatResult(data);
    return {
      content: [{ type: 'text', text: `Cover image removed from "${slug}".` }],
    };
  },
);

// ── add_comment ──
server.registerTool(
  'add_comment',
  {
    description:
      'Add a comment to a blog post. Comments are public and visible to all visitors. ' +
      "The author name is optional — if omitted, it uses the API key owner's display name. " +
      'To reply to an existing comment, pass its ID as parentId (get comment IDs from get_post).',
    inputSchema: {
      slug: z.string().describe('Post slug to comment on'),
      content: z
        .string()
        .min(1)
        .max(500)
        .describe('Comment text (1-500 characters)'),
      author: z
        .string()
        .optional()
        .describe(
          'Display name for the comment (defaults to API key owner name)',
        ),
      parentId: z
        .string()
        .optional()
        .describe(
          'Parent comment ID for threaded replies (get from get_post comments)',
        ),
    },
  },
  async ({ slug, content, author, parentId }) => {
    const body = { content };
    if (author) body.author = author;
    if (parentId) body.parentId = parentId;
    const data = await api(`/posts/${encodeURIComponent(slug)}/comments`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (data?.error) return formatResult(data);
    return {
      content: [
        {
          type: 'text',
          text: `Comment added to "${slug}".\n${JSON.stringify(data, null, 2)}`,
        },
      ],
    };
  },
);

// ── delete_comment ──
server.registerTool(
  'delete_comment',
  {
    description:
      'Delete a comment by its ID. You can only delete comments you own (created with your API key). ' +
      'Get comment IDs from get_post.',
    inputSchema: {
      id: z.string().describe('Comment ID to delete'),
    },
  },
  async ({ id }) => {
    const data = await api(`/comments/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (data?.error) return formatResult(data);
    return {
      content: [{ type: 'text', text: 'Comment deleted.' }],
    };
  },
);

// ── toggle_like ──
server.registerTool(
  'toggle_like',
  {
    description:
      "Toggle the like status for a post. If you haven't liked it, this adds a like. If you already liked it, this removes the like. " +
      'Each API key can like a post only once.',
    inputSchema: {
      slug: z.string().describe('Post slug to toggle like on'),
    },
  },
  async ({ slug }) => {
    const data = await api(`/posts/${encodeURIComponent(slug)}/like`, {
      method: 'POST',
    });
    if (data?.error) return formatResult(data);
    const liked = data.data?.liked ?? false;
    return {
      content: [
        {
          type: 'text',
          text: liked ? `Liked "${slug}".` : `Unliked "${slug}".`,
        },
      ],
    };
  },
);

// ── list_tags ──
server.registerTool(
  'list_tags',
  {
    description:
      'List all available tags with their names, slugs, colors, and post counts. ' +
      'Use this before creating posts with tags to check which tags exist. ' +
      'Use create_tag to add new tags before referencing them in posts.',
    inputSchema: undefined,
  },
  async () => {
    const data = await api('/tags');
    return formatResult(data);
  },
);

// ── create_tag ──
server.registerTool(
  'create_tag',
  {
    description:
      'Create a new tag that can be assigned to posts. ' +
      'After creating a tag, use its name in create_post or update_post tags array. ' +
      'Tags are shared across all posts — check list_tags first to avoid duplicates.',
    inputSchema: {
      name: z
        .string()
        .min(1)
        .max(50)
        .describe('Tag display name (e.g. "JavaScript")'),
      slug: z
        .string()
        .optional()
        .describe(
          'Custom URL slug (auto-generated from name if omitted, e.g. "javascript")',
        ),
      color: z
        .string()
        .optional()
        .describe(
          'Hex color code (e.g. "#ff0000"), randomly assigned if omitted',
        ),
    },
  },
  async ({ name, slug, color }) => {
    const body = { name };
    if (slug) body.slug = slug;
    if (color) body.color = color;
    const data = await api('/tags', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (data?.error) return formatResult(data);
    return {
      content: [
        {
          type: 'text',
          text: `Tag "${name}" created. You can now use it in create_post or update_post.`,
        },
      ],
    };
  },
);

// ── delete_tag ──
server.registerTool(
  'delete_tag',
  {
    description:
      'Delete a tag. This removes the tag from all posts that use it. ' +
      'Get tag IDs from list_tags.',
    inputSchema: {
      id: z.string().describe('Tag ID to delete (get from list_tags)'),
    },
  },
  async ({ id }) => {
    const data = await api(`/tags/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (data?.error) return formatResult(data);
    return {
      content: [{ type: 'text', text: 'Tag deleted.' }],
    };
  },
);

// ── upload_image ──
server.registerTool(
  'upload_image',
  {
    description:
      'Upload a local image file to the blog and get a public URL. ' +
      'Use this to embed images in post content with Markdown syntax: ![alt text](url). ' +
      'Accepts JPG, PNG, WebP formats. Maximum file size: 2MB. ' +
      'imagePath must be an absolute path to the image file on the local filesystem.',
    inputSchema: {
      imagePath: z
        .string()
        .describe(
          'Absolute path to the local image file (e.g. "/home/user/photo.jpg" or "C:\\Users\\photo.jpg")',
        ),
    },
  },
  async ({ imagePath }) => {
    let file;
    try {
      file = readFileSync(imagePath);
    } catch (err) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Cannot read file "${imagePath}" — ${err.message}. Make sure the path is absolute and the file exists.`,
          },
        ],
        isError: true,
      };
    }
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
    formData.append('image', blob, `image.${ext}`);
    const data = await api('/images', {
      method: 'POST',
      body: formData,
    });
    if (data?.error) return formatResult(data);
    const url = data.data?.url;
    return {
      content: [
        {
          type: 'text',
          text:
            `Image uploaded successfully!\n` +
            `URL: ${url}\n\n` +
            `Use in Markdown: ![image](${url})`,
        },
      ],
    };
  },
);

// ── Start ──
const transport = new StdioServerTransport();
await server.connect(transport);

// StdioServerTransport 通过 stderr 输出日志是安全的，stdout 被 MCP 协议占用
console.error(`Vibe Blog MCP server started — API: ${BLOG_API_URL}`);
