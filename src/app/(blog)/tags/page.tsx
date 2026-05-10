import { getAllTagsWithCounts } from '@/lib/db/queries';
import { createClient } from '@/lib/supabase/server';
import { isSuperAdmin } from '@/lib/utils/admin';
import { TagManager } from '@/components/tags/tag-manager';

export const revalidate = 300;
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '标签管理',
  openGraph: { title: '标签管理' },
  twitter: { card: 'summary_large_image', title: '标签管理' },
};

export default async function TagsPage() {
  const tags = await getAllTagsWithCounts();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? null;
  const isAdmin = await isSuperAdmin(user);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">标签管理</h1>
      <TagManager
        initialTags={tags}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />
    </div>
  );
}
