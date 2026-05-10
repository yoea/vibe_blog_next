'use client';

import { useState, useEffect, useRef } from 'react';
import { PostCard } from './post-card';
import { LoadMore } from '@/components/shared/load-more';

interface PostData {
  id: string;
  author_id: string;
  title: string;
  slug: string;
  published: boolean;
  created_at: string;
  excerpt?: string | null;
  like_count?: number;
  comment_count?: number;
  author?: { email?: string | null; name?: string | null } | null;
}

export function PostListClient({
  initialPosts,
  initialTotal,
  showActions,
  onLoadMore,
  loadedAllText = '已加载全部',
  linkRef,
}: {
  initialPosts: PostData[];
  initialTotal: number;
  showActions?: boolean;
  onLoadMore: (page: number) => Promise<{
    data?: PostData[];
    count?: number | null;
    error?: string | null;
  }>;
  loadedAllText?: string;
  linkRef?: string;
}) {
  // Restore cached posts immediately to avoid flash on back-navigation
  const [posts, setPosts] = useState<PostData[]>(() => {
    if (typeof window === 'undefined') return initialPosts;
    const cached = sessionStorage.getItem('home_list_posts');
    if (!cached) return initialPosts;
    try {
      const parsed = JSON.parse(cached);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : initialPosts;
    } catch {
      return initialPosts;
    }
  });
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(() => {
    if (typeof window === 'undefined') return 1;
    const cached = sessionStorage.getItem('home_list_posts');
    if (!cached) return 1;
    try {
      const parsed = JSON.parse(cached);
      return Array.isArray(parsed) ? Math.ceil(parsed.length / 5) : 1;
    } catch {
      return 1;
    }
  });
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(false);

  // Restore scroll position on back navigation
  useEffect(() => {
    const saved = sessionStorage.getItem('home_list_scroll');
    if (!saved) return;
    sessionStorage.removeItem('home_list_scroll');
    try {
      const scrollY = JSON.parse(saved);
      if (typeof scrollY === 'number') window.scrollTo(0, scrollY);
    } catch {
      // ignore
    }
  }, []);

  // Save scroll position and posts to sessionStorage
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    // Save posts whenever they change (covers load more + navigation)
    sessionStorage.setItem('home_list_posts', JSON.stringify(posts));

    let timer: ReturnType<typeof setTimeout>;
    const saveScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        sessionStorage.setItem(
          'home_list_scroll',
          JSON.stringify(window.scrollY),
        );
      }, 500);
    };
    window.addEventListener('scroll', saveScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', saveScroll);
    };
  }, [posts]);

  // Sync with server props — but don't overwrite cached state with fewer posts
  useEffect(() => {
    if (initialPosts.length >= posts.length) {
      setPosts(initialPosts);
      setTotal(initialTotal);
      setPage(1);
      sessionStorage.removeItem('home_list_posts');
      sessionStorage.removeItem('home_list_scroll');
    }
  }, [initialPosts, initialTotal]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasMore = posts.length < total;

  const handleLoadMore = async () => {
    setLoading(true);
    const nextPage = page + 1;
    const result = await onLoadMore(nextPage);
    const newPosts = result.data;
    if (newPosts) {
      if (newPosts.length === 0) {
        return;
      }
      setPosts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const trulyNew = newPosts.filter((p) => !existingIds.has(p.id));
        return [...prev, ...trulyNew];
      });
      setPage(nextPage);
    }
    setLoading(false);
  };

  if (!posts.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg mb-2">
          {showActions ? '还没有文章' : '还没有文章'}
        </p>
        <p className="text-sm">
          {showActions
            ? '点击右上角按钮开始写作'
            : '登录后可以写你的第一篇文章'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            showActions={showActions}
            linkRef={linkRef}
          />
        ))}
      </div>

      <LoadMore
        hasMore={hasMore}
        loading={loading}
        onLoadMore={handleLoadMore}
        currentCount={posts.length}
        totalCount={total}
        loadedAllText={loadedAllText}
        textOnly
      />
    </div>
  );
}
