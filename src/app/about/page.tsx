import type { Metadata } from 'next';
import { getBuildInfo } from '@/lib/build-info';

export const metadata: Metadata = {
  title: '关于本站',
};

export default function AboutPage() {
  const buildInfo = getBuildInfo();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">关于本站</h1>

      <div className="space-y-6">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">字里行间</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            「字里行间」是一个基于 Supabase
            构建的博客平台。不止是博客，更是交流的空间。
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            在这里，你可以撰写技术文章、分享生活感悟，与志同道合的朋友在评论区交流互动。
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">功能特性</h2>
          <ul className="text-sm text-muted-foreground leading-relaxed space-y-1 list-disc list-inside">
            <li>Markdown 写作，支持代码高亮、表格、任务列表</li>
            <li>文章标签分类，快速定位感兴趣的内容</li>
            <li>评论与回复，支持多级嵌套</li>
            <li>留言板，与作者和读者直接交流</li>
            <li>深色/浅色主题自由切换</li>
            <li>RSS 订阅，不错过任何更新</li>
            <li>响应式设计，桌面和移动端皆可流畅浏览</li>
          </ul>
        </section>

        <section className="space-y-1.5">
          <h2 className="text-lg font-semibold">技术栈</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Next.js 16 · Supabase · Tailwind CSS v4 · shadcn/ui · PM2 · Nginx
          </p>
        </section>

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
          className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
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
