import type { Metadata } from 'next';
import { getBuildInfo } from '@/lib/build-info';
import { createClient } from '@/lib/supabase/server';
import { GitFork, Bot, BookOpen, Key, Shield } from 'lucide-react';
import { GitHubIcon } from '@/components/icons/github-icon';

const repoLinks = [
  {
    label: 'GitHub',
    url: 'https://github.com/yoea/vibe_blog_next',
    icon: <GitHubIcon className="h-4 w-4" />,
  },
  {
    label: 'Gitee',
    url: 'https://git.ewing.top/yoea/vibe_blog_next',
    icon: <GitFork className="h-4 w-4" />,
  },
];

const features = [
  '用户注册与登录，支持邮箱 / GitHub OAuth',
  'Markdown 写作，实时预览，自动保存草稿到云端',
  '文章封面图上传与裁剪（16:9，滚动揭示动画）',
  'AI 一键生成文章摘要 + 标签推荐（兼容 OpenAI API）',
  '文章标签分类与标签管理',
  '评论与回复，支持 2 层嵌套树形展示',
  '作者主页 + 留言板，每位作者拥有独立的个人空间',
  '文章点赞（登录用户 + 匿名访客双重追踪）',
  '首页站点统计（访问量 + 点赞数，IP 去重 + 频率限制）',
  '深色 / 浅色 / 跟随系统，三种主题模式',
  '全站 OG / Twitter 社交分享标签',
  '响应式设计，桌面端与移动端体验一致',
  '匿名操作频率限制（10次/小时）',
  'ISR 5 分钟缓存，缓解 Supabase Free Tier 冷启动延迟',
];

const agentFeatures = [
  { label: 'data-testid', desc: '所有交互元素均包含 data-testid 属性' },
  { label: 'aria-label', desc: '仅图标按钮提供 aria-label 文本描述' },
  { label: '语义化 HTML', desc: '使用 nav、main、section、button 等标准元素' },
  {
    label: 'llms.txt',
    desc: '站点说明书：页面结构、data-testid 约定、API 端点列表',
  },
  {
    label: 'OpenAPI 3.0',
    desc: '/api/v1/openapi.json — 完整 API 请求/响应 schema',
  },
  {
    label: '错误码标准化',
    desc: '所有 API 返回统一错误码，方便 Agent 分支处理',
  },
];

const apiEndpoints = [
  { method: 'GET', path: '/api/v1/posts', desc: '文章列表（分页）' },
  { method: 'POST', path: '/api/v1/posts', desc: '创建文章' },
  { method: 'GET', path: '/api/v1/posts/{slug}', desc: '获取文章' },
  { method: 'PUT', path: '/api/v1/posts/{slug}', desc: '更新文章' },
  { method: 'DELETE', path: '/api/v1/posts/{slug}', desc: '删除文章' },
  { method: 'POST', path: '/api/v1/posts/{slug}/comments', desc: '添加评论' },
  { method: 'DELETE', path: '/api/v1/comments/{id}', desc: '删除评论' },
  { method: 'POST', path: '/api/v1/posts/{slug}/like', desc: '切换点赞' },
  { method: 'GET', path: '/api/v1/whoami', desc: '获取当前 key 的用户信息' },
];

const errorCodes = [
  { code: 'UNAUTHORIZED', http: 401, desc: '未认证（API Key 缺失或无效）' },
  { code: 'FORBIDDEN', http: 403, desc: '无权限操作' },
  { code: 'NOT_FOUND', http: 404, desc: '资源不存在' },
  { code: 'VALIDATION', http: 400, desc: '参数校验失败' },
  { code: 'RATE_LIMITED', http: 429, desc: '频率限制' },
  { code: 'CONFLICT', http: 409, desc: '资源冲突' },
  { code: 'SERVER_ERROR', http: 500, desc: '服务端错误' },
];

const techStack = [
  { label: '框架', value: 'Next.js 16 (App Router) + React 19' },
  { label: '语言', value: 'TypeScript' },
  { label: '样式', value: 'Tailwind CSS v4 + shadcn/ui' },
  { label: '数据库', value: 'Supabase (PostgreSQL + RLS)' },
  { label: '认证', value: 'Supabase Auth (PKCE 流程)' },
  {
    label: 'Markdown',
    value: 'react-markdown + remark-gfm + rehype-highlight',
  },
  { label: '图标', value: 'Lucide React' },
  { label: '部署', value: 'PM2 + Nginx 反向代理' },
  { label: '许可证', value: 'AGPL-3.0' },
];

export const metadata: Metadata = {
  title: '关于本站',
  openGraph: { title: '关于本站' },
  twitter: { card: 'summary_large_image', title: '关于本站' },
};

export default async function AboutPage() {
  const buildInfo = getBuildInfo();

  const supabase = await createClient();
  const { data: aiModelRow } = await supabase
    .from('site_config')
    .select('value')
    .eq('key', 'ai_model')
    .maybeSingle();
  const aiModel = aiModelRow?.value || '未配置';

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-bold">关于本站</h1>

      {/* ── 简介 ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">字里行间</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          「字里行间」是一个基于 Next.js + Supabase
          构建的开源博客平台。从设计之初就同时面向 人类用户与 AI
          Agent——不止是写作工具，更是读者与作者交流的空间。
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          项目以 AGPL-3.0
          协议开源，代码完全透明。你可以自由部署、修改和参与贡献。
        </p>
      </section>

      {/* ── 仓库地址 ── */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">仓库地址</h2>
        <div className="flex flex-wrap gap-3">
          {repoLinks.map((repo) => (
            <a
              key={repo.label}
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {repo.icon}
              <span>{repo.label}</span>
            </a>
          ))}
        </div>
      </section>

      {/* ── 核心理念：AI Agent 友好 ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold inline-flex items-center gap-2">
          <Bot className="h-5 w-5" />
          核心理念：AI Agent 友好
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          本项目是全球首个从设计之初即面向 AI Agent 操作的博客系统。AI Agent（如
          Claude Code、OpenClaw、Hermes-agent 等基于 Playwright 的自动化
          Agent）可以通过 UI 自动化或 RESTful API 两种方式操作本网站。
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {agentFeatures.map((f) => (
            <div
              key={f.label}
              className="flex items-start gap-2.5 rounded-md border bg-card px-3 py-2.5"
            >
              <code className="shrink-0 font-mono text-xs bg-muted px-1.5 py-0.5 rounded mt-px">
                {f.label}
              </code>
              <span className="text-xs text-muted-foreground">{f.desc}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          AI Agent 使用前应先读取{' '}
          <code className="font-mono bg-muted px-1 rounded">/llms.txt</code>{' '}
          了解站点结构， 通过{' '}
          <code className="font-mono bg-muted px-1 rounded">
            /api/v1/openapi.json
          </code>{' '}
          获取完整 API 规范。
        </p>
      </section>

      {/* ── 功能特性 ── */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">功能特性</h2>
        <ul className="text-sm text-muted-foreground leading-relaxed space-y-1 list-disc list-inside">
          {features.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </section>

      {/* ── RESTful API ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold inline-flex items-center gap-2">
          <Key className="h-5 w-5" />
          RESTful API
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          提供基于 API Key 的编程访问接口。管理员在设置页生成独立密钥（ew-
          开头），
          <code className="font-mono text-xs bg-muted px-1 rounded">
            author_id
          </code>{' '}
          由密钥自动确定。 请求时携带{' '}
          <code className="font-mono text-xs bg-muted px-1 rounded">
            Authorization: Bearer ew-xxxxxxxx
          </code>
          。
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border">
            <thead>
              <tr className="bg-muted">
                <th className="px-3 py-1.5 text-left font-medium w-16">方法</th>
                <th className="px-3 py-1.5 text-left font-medium">路径</th>
                <th className="px-3 py-1.5 text-left font-medium">说明</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {apiEndpoints.map((ep) => (
                <tr key={ep.method + ep.path}>
                  <td className="px-3 py-1.5">
                    <span className="font-mono font-medium text-primary">
                      {ep.method}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 font-mono">{ep.path}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">
                    {ep.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── 错误码系统 ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold inline-flex items-center gap-2">
          <Shield className="h-5 w-5" />
          错误码系统
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          所有 Server Actions 和 API Routes 返回统一的错误码枚举，方便 AI Agent
          按
          <code className="font-mono text-xs bg-muted px-1 rounded">
            error_code
          </code>{' '}
          分支处理：
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border">
            <thead>
              <tr className="bg-muted">
                <th className="px-3 py-1.5 text-left font-medium">
                  error_code
                </th>
                <th className="px-3 py-1.5 text-left font-medium w-16">HTTP</th>
                <th className="px-3 py-1.5 text-left font-medium">含义</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {errorCodes.map((ec) => (
                <tr key={ec.code}>
                  <td className="px-3 py-1.5 font-mono">{ec.code}</td>
                  <td className="px-3 py-1.5">{ec.http}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">
                    {ec.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-md border bg-muted/30 px-3 py-2">
          <pre className="text-xs font-mono text-muted-foreground overflow-x-auto">
            {`const result = await savePost(formData);
if (result.error_code === 'RATE_LIMITED') { /* 等待后重试 */ }
if (result.error_code === 'UNAUTHORIZED') { /* 重新登录 */ }`}
          </pre>
        </div>
      </section>

      {/* ── AI 内容生成 ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold inline-flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          AI 内容生成
        </h2>
        <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
          <p>
            文章编辑器内置 AI 辅助功能，可一键生成摘要和推荐标签。兼容 OpenAI
            API，支持任意兼容的模型服务。
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <span className="font-medium text-foreground">摘要生成</span> —
              基于标题与正文提炼核心观点，输出 140 字以内的精炼摘要。
            </li>
            <li>
              <span className="font-medium text-foreground">标签推荐</span> —
              分析文章主题输出 4 个主标签 + 6
              个备选标签，匹配站点常用标签的自动填入。
            </li>
          </ul>
          <p>
            当前驱动模型：
            <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded ml-1">
              {aiModel}
            </code>
          </p>
        </div>
      </section>

      {/* ── 技术栈 ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">技术栈</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {techStack.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between px-3 py-2 rounded-md border bg-card"
            >
              <span className="text-muted-foreground text-xs">
                {item.label}
              </span>
              <span className="text-xs font-medium text-right ml-2">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 缓存与性能 ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">缓存与性能</h2>
        <div className="text-sm text-muted-foreground leading-relaxed space-y-1.5">
          <p>
            为缓解 Supabase Free Tier 冷启动延迟，公开页面启用
            ISR（增量静态再生成）：
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border">
              <thead>
                <tr className="bg-muted">
                  <th className="px-3 py-1.5 text-left font-medium">页面</th>
                  <th className="px-3 py-1.5 text-left font-medium">缓存</th>
                  <th className="px-3 py-1.5 text-left font-medium">说明</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="px-3 py-1.5 font-mono">首页 /</td>
                  <td className="px-3 py-1.5">5 分钟</td>
                  <td className="px-3 py-1.5">revalidate = 300</td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5 font-mono">
                    文章详情 /posts/[slug]
                  </td>
                  <td className="px-3 py-1.5">5 分钟</td>
                  <td className="px-3 py-1.5">revalidate = 300</td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5">管理页 / 编辑页 / 设置页</td>
                  <td className="px-3 py-1.5">无缓存</td>
                  <td className="px-3 py-1.5">实时数据</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            发布或修改文章后，
            <code className="font-mono text-xs bg-muted px-1 rounded">
              revalidatePath
            </code>{' '}
            自动清除相关缓存。点赞与评论通过 Server Actions + 乐观 UI
            处理，不受服务端缓存影响。
          </p>
        </div>
      </section>

      {/* ── 构建信息 ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">构建信息</h2>
        <div className="rounded-lg border divide-y">
          <InfoRow
            label="版本"
            value={`v${buildInfo.version}`}
            href={`https://github.com/yoea/vibe_blog_next/releases/tag/v${buildInfo.version}`}
          />
          {buildInfo.buildTime && (
            <InfoRow
              label="构建时间"
              value={new Date(buildInfo.buildTime).toLocaleString('zh-CN')}
            />
          )}
          {buildInfo.commit && (
            <InfoRow label="提交" value={buildInfo.commit} mono />
          )}
          {buildInfo.commitCount !== null && (
            <InfoRow label="提交次数" value={`${buildInfo.commitCount}次`} />
          )}
          {buildInfo.contributors && (
            <InfoRow label="开发者" value={buildInfo.contributors} />
          )}
          <InfoRow label="运行时" value={`Node ${buildInfo.nodeVersion}`} />
        </div>
      </section>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
  href,
}: {
  label: string;
  value: string;
  mono?: boolean;
  href?: string;
}) {
  const content = (
    <span
      className={`text-right max-w-[60%] truncate ${mono ? 'font-mono text-xs' : ''}`}
      title={value}
    >
      {value}
    </span>
  );
  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-foreground hover:underline transition-colors"
        >
          <GitHubIcon className="h-3.5 w-3.5" />
          <span className={`text-right ${mono ? 'font-mono text-xs' : ''}`}>
            {value}
          </span>
        </a>
      ) : (
        content
      )}
    </div>
  );
}
