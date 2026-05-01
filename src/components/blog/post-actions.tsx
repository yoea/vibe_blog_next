'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { deletePost } from '@/lib/actions/post-actions';
import type { PostWithAuthor } from '@/lib/db/types';
import Link from 'next/link';

export function PostActions({ post }: { post: PostWithAuthor }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('确定删除这篇文章？')) return;
    setIsDeleting(true);
    await deletePost(post.id);
    window.location.href = '/';
  };

  return (
    <div className="flex items-center gap-2 pt-2 border-t">
      <Link href={`/posts/${post.slug}?edit=true`}>
        <button className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors cursor-pointer">
          编辑
        </button>
      </Link>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
      >
        {isDeleting ? '删除中...' : '删除'}
      </button>
    </div>
  );
}
