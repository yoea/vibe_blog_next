import { getAllUsers } from '@/lib/db/queries';
import { loadMoreAuthors } from '@/lib/actions/post-actions';
import { deleteUserAsAdmin } from '@/lib/actions/admin-actions';
import { isSuperAdmin, getSuperAdminUserIds } from '@/lib/utils/admin';

export const revalidate = 600;
import { AuthorListClient } from '@/components/blog/author-list-client';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: '作者列表',
  openGraph: { title: '作者列表' },
  twitter: { card: 'summary_large_image', title: '作者列表' },
};

export default async function AuthorListPage() {
  const { data: users, hasMore = false, error } = await getAllUsers(1, 20);

  if (error) {
    return <p className="text-destructive">加载失败: {error}</p>;
  }

  const isAdmin = await isSuperAdmin();

  // Get the current user ID and all super admin user IDs for protection
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const currentUserId = user?.id ?? '';
  const adminUserIds = isAdmin ? await getSuperAdminUserIds() : [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">作者列表</h1>
      <AuthorListClient
        initialAuthors={users}
        initialHasMore={hasMore}
        onLoadMore={loadMoreAuthors}
        isAdmin={isAdmin}
        onDeleteUser={deleteUserAsAdmin}
        currentUserId={currentUserId}
        adminUserIds={adminUserIds}
      />
    </div>
  );
}
