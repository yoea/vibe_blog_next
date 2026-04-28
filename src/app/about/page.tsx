import type { Metadata } from 'next'
import { getBuildInfo } from '@/lib/build-info'

export const metadata: Metadata = {
  title: '关于本站',
}

export default function AboutPage() {
  const buildInfo = getBuildInfo()

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">关于本站</h1>

      <div className="space-y-6">
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">字里行间</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            「字里行间」是一个基于 Supabase 构建的博客平台。不止是博客，更是交流的空间。
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

        <section className="space-y-2">
          <h2 className="text-lg font-semibold">技术栈</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            本站使用 Next.js、Supabase、Tailwind CSS 构建，支持 Markdown 写作、评论互动、标签分类等功能。
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">构建信息</h2>
          <div className="rounded-lg border divide-y">
            <InfoRow label="版本" value={`${process.env.NEXT_PUBLIC_SITE_TITLE || 'Blog'} v${buildInfo.version}`} />
            {buildInfo.buildTime && <InfoRow label="构建时间" value={new Date(buildInfo.buildTime).toLocaleString('zh-CN')} />}
            {buildInfo.commit && <InfoRow label="提交" value={buildInfo.commit} mono />}
            {buildInfo.commitCount !== null && <InfoRow label="提交次数" value={buildInfo.commitCount.toLocaleString()} />}
            {buildInfo.contributors && <InfoRow label="开发者" value={buildInfo.contributors} />}
            <InfoRow label="运行时" value={`Node ${buildInfo.nodeVersion}`} />
          </div>
        </section>
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`text-right max-w-[60%] truncate ${mono ? 'font-mono text-xs' : ''}`} title={value}>
        {value}
      </span>
    </div>
  )
}
