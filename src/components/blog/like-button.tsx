'use client';

import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useTransition, useEffect } from 'react';
import { toast } from 'sonner';
import { toggleLike } from '@/lib/actions/like-actions';

export function LikeButton({
  postId,
  initialCount,
  isLiked,
}: {
  postId: string;
  initialCount: number;
  isLiked: boolean;
}) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(isLiked);
  const [isPending, startTransition] = useTransition();
  const [ip, setIp] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // 独立从服务端确认点赞状态，绕过客户端 Router Cache 对 isLiked prop 的缓存
  useEffect(() => {
    setReady(false);
    fetch(`/api/check-like?postId=${postId}`)
      .then((r) => r.json())
      .then((data) => {
        setLiked(data.isLiked);
        setReady(true);
      })
      .catch(() => setReady(true));
  }, [postId]);

  useEffect(() => {
    fetch('/api/my-ip')
      .then((r) => r.json())
      .then((data) => setIp(data.ip))
      .catch(() => setIp('unknown'));
  }, []);

  const handleToggle = async () => {
    if (!ip) return;
    const newLiked = !liked;
    setCount((c) => (newLiked ? c + 1 : c - 1));
    setLiked(newLiked);

    startTransition(async () => {
      const result = await toggleLike(postId, ip);
      if (result.error) {
        setLiked(!newLiked);
        setCount((c) => (!newLiked ? c + 1 : c - 1));
        toast.error(result.error);
      }
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      disabled={isPending || !ip || !ready}
      className={`gap-1.5 active:scale-95 transition-transform ${liked ? 'text-red-500 hover:text-red-600' : ''}`}
    >
      <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} />
      <span>{count}</span>
    </Button>
  );
}
