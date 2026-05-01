import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { PostEditor } from '@/components/blog/post-editor';
import { getTopTags } from '@/lib/db/queries';

export default async function NewPostPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/posts/new');

  const suggestedTags = await getTopTags(10);

  return (
    <div className="space-y-6 flex flex-col flex-1 min-h-0">
      <h1 className="text-3xl font-bold shrink-0">写新文章</h1>
      <PostEditor suggestedTags={suggestedTags} />
    </div>
  );
}
