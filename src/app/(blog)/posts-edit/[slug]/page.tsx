import { getPostBySlug, getTopTags } from '@/lib/db/queries';
import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { connection } from 'next/server';
import { headers } from 'next/headers';
import { EditPageClient } from '@/components/blog/edit-page-client';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditPostPage({ params }: PageProps) {
  const { slug } = await params;
  await connection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/unauthorized?reason=login&redirect=${encodeURIComponent(`/posts-edit/${slug}`)}`,
    );
  }

  const { data: post, error } = await getPostBySlug(slug);

  if (!post || error) {
    notFound();
  }

  if (user.id !== post.author_id) redirect('/unauthorized');

  const suggestedTags = await getTopTags(10);
  const requestHeaders = await headers();
  const referer = requestHeaders.get('referer') ?? '';
  const from = referer.includes('/profile') ? 'profile' : 'post';

  return (
    <div className="space-y-6 flex flex-col flex-1 min-h-0">
      <EditPageClient
        post={post as any}
        suggestedTags={suggestedTags}
        from={from}
      />
    </div>
  );
}
