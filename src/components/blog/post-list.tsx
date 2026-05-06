import { getPublishedPosts } from '@/lib/db/queries';
import { PostListClient } from './post-list-client';
import { loadMorePublishedPosts } from '@/lib/actions/post-actions';

export async function PostList() {
  const { data: posts, count, error } = await getPublishedPosts(1, 5);

  if (error) {
    return <p className="text-destructive">加载文章失败: {error}</p>;
  }

  return (
    <PostListClient
      initialPosts={posts}
      initialTotal={count ?? 0}
      onLoadMore={loadMorePublishedPosts}
    />
  );
}
