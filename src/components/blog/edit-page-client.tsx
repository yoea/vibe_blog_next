'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PostEditor } from '@/components/blog/post-editor';
import { ClearContentButton } from '@/components/blog/clear-content-button';
import { DeletePostButton } from '@/components/blog/delete-post-button';
import type { PostWithAuthor } from '@/lib/db/types';

interface Props {
  post: PostWithAuthor;
  suggestedTags: {
    name: string;
    slug: string;
    color: string | null;
    post_count: number;
  }[];
  from?: 'profile' | 'post';
}

export function EditPageClient({ post, suggestedTags, from = 'post' }: Props) {
  const [editorKey, setEditorKey] = useState(0);

  const backHref = from === 'profile' ? '/profile' : `/posts/${post.slug}`;
  const backLabel = from === 'profile' ? '返回个人中心' : '返回文章详情';

  return (
    <>
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <Button variant="ghost" size="sm">
          <Link href={backHref} className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{backLabel}</span>
          </Link>
        </Button>
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <ClearContentButton
            postId={post.id}
            onClear={() => setEditorKey((k) => k + 1)}
          />
          <DeletePostButton postId={post.id} postTitle={post.title} />
        </div>
      </div>
      <h1 className="text-3xl font-bold">编辑文章</h1>
      <PostEditor
        resetKey={editorKey}
        initialData={post as any}
        suggestedTags={suggestedTags}
      />
    </>
  );
}
