import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PostEditor } from '@/components/blog/post-editor';
import { getAllTags } from '@/lib/db/queries';

export default async function NewPostPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/unauthorized?reason=login&redirect=/posts/new');

  const suggestedTags = await getAllTags();

  return (
    <div className="space-y-6 flex flex-col flex-1 min-h-0">
      <h1 className="text-3xl font-bold shrink-0">写新文章</h1>
      <PostEditor suggestedTags={suggestedTags} />
    </div>
  );
}
