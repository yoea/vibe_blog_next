import { getAllTagsWithCounts } from '@/lib/db/queries'
import { createClient } from '@/lib/supabase/server'
import { TagManager } from '@/components/tags/tag-manager'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '标签管理',
}

export default async function TagsPage() {
  const tags = await getAllTagsWithCounts()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const currentUserId = user?.id ?? null

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">标签管理</h1>
      <TagManager initialTags={tags} currentUserId={currentUserId} />
    </div>
  )
}
