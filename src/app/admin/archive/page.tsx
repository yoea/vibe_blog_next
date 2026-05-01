import { redirect } from 'next/navigation'
import { isSuperAdmin } from '@/lib/utils/admin'
import { getArchivedPosts } from '@/lib/db/queries'
import { ArchiveList } from '@/components/admin/archive-list'
import { Breadcrumb } from '@/components/layout/breadcrumb'
import { Archive } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '归档管理',
}

interface PageProps {
  searchParams: Promise<{ q?: string; page?: string }>
}

export default async function ArchivePage({ searchParams }: PageProps) {
  if (!await isSuperAdmin()) redirect('/')

  const { q, page: pageParam } = await searchParams
  const search = q?.trim() ?? ''
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)

  const { data: archives, count, error } = await getArchivedPosts(page, 20, search || undefined)

  const breadcrumbItems = [
    { label: '首页', href: '/' },
    { label: '归档管理' },
  ]

  return (
    <div className="space-y-6">
      <Breadcrumb items={breadcrumbItems} />

      <div className="flex items-center gap-2">
        <Archive className="h-6 w-6" />
        <h1 className="text-2xl font-bold">归档管理</h1>
      </div>

      {error ? (
        <p className="text-sm text-destructive">加载失败: {error}</p>
      ) : (
        <ArchiveList
          archives={archives}
          total={count}
          page={page}
          search={search}
        />
      )}
    </div>
  )
}
