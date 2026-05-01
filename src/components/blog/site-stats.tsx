'use client';

import { useEffect, useState } from 'react';
import { Heart, Eye } from 'lucide-react';
import { toast } from 'sonner';

const MAX_CLICKS_PER_HOUR = 10;
const CLICK_COOLDOWN_MS = 3000;

function getClickTimes(): number[] {
  try {
    const raw = localStorage.getItem('site_click_times');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    localStorage.removeItem('site_click_times');
    return [];
  }
}

function checkRateLimit(): { allowed: boolean; message?: string } {
  const clickTimes = getClickTimes();
  const now = Date.now();
  const oneHourAgo = now - 3600000;
  const recentClicks = clickTimes.filter((t) => t > oneHourAgo);

  if (recentClicks.length >= MAX_CLICKS_PER_HOUR) {
    return {
      allowed: false,
      message: '感谢你的喜爱！今天已经点赞够了，明天再来吧 😊',
    };
  }

  if (
    recentClicks.length > 0 &&
    now - recentClicks[recentClicks.length - 1] < CLICK_COOLDOWN_MS
  ) {
    return { allowed: false, message: '点赞太频繁啦，请稍等一会儿再点击 😄' };
  }

  return { allowed: true };
}

function recordClick() {
  const times = getClickTimes();
  times.push(Date.now());
  localStorage.setItem('site_click_times', JSON.stringify(times));
}

export function SiteStats({
  initialViews,
  initialLikes,
}: {
  initialViews: number;
  initialLikes: number;
}) {
  const [views, setViews] = useState(initialViews);
  const [likes, setLikes] = useState(initialLikes);
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    fetch('/api/site-stats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'view', ts: Date.now() }),
    }).catch(() => {});
  }, []);

  const handleLike = async () => {
    console.log('[SiteStats] handleLike called, isLiking:', isLiking);
    if (isLiking) return;

    const check = checkRateLimit();
    console.log('[SiteStats] checkRateLimit:', check);
    if (!check.allowed) {
      toast.info(check.message!);
      return;
    }

    setIsLiking(true);
    recordClick();
    setLikes((p) => p + 1);
    console.log('[SiteStats] liked, new count:', likes + 1);

    try {
      const res = await fetch('/api/site-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'like', ts: Date.now() }),
      });
      console.log('[SiteStats] API response:', res.status);
      if (!res.ok) {
        let errMsg = '';
        try {
          const data = await res.json();
          errMsg = data.error || '';
        } catch {}
        console.error('[SiteStats] API error:', res.status, errMsg);
        if (res.status === 429) {
          toast.info('感谢你的喜爱！今天已经点赞够了，明天再来吧 😊');
        } else {
          toast.error(errMsg ? `点赞失败：${errMsg}` : '点赞失败，请重试');
        }
        setLikes((p) => p - 1);
        const times = getClickTimes();
        times.pop();
        localStorage.setItem('site_click_times', JSON.stringify(times));
      }
    } catch (e) {
      console.error('[SiteStats] fetch error:', e);
      toast.error('网络错误，请重试');
      setLikes((p) => p - 1);
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <div className="flex items-center justify-center gap-4 text-muted-foreground select-none">
      <button
        type="button"
        onClick={handleLike}
        disabled={isLiking}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150 hover:text-pink-500 hover:bg-pink-50 active:scale-95 disabled:opacity-50 cursor-pointer touch-manipulation"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <Heart
          className={`h-3.5 w-3.5 transition-all duration-150 ${isLiking ? 'scale-125 fill-pink-400 text-pink-400' : 'fill-pink-400 text-pink-400'}`}
        />
        <span>{likes}</span>
      </button>
      <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium">
        <Eye className="h-3.5 w-3.5" />
        <span>{views}</span>
      </div>
    </div>
  );
}
