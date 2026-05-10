'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LoadMoreProps {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
  /** 剩余未展示数量（可选） */
  remaining?: number;
  /** 当前已展示数量（用于纯文字模式） */
  currentCount?: number;
  /** 总数量（用于纯文字模式） */
  totalCount?: number;
  idleText?: string;
  loadingText?: string;
  loadedAllText?: string;
  showLoadedAll?: boolean;
  /** 纯文字模式（无按钮） */
  textOnly?: boolean;
}

export function LoadMore({
  hasMore,
  loading,
  onLoadMore,
  remaining,
  currentCount = 0,
  totalCount = 0,
  idleText = '显示更多',
  loadingText = '加载中...',
  loadedAllText = '已显示全部',
  showLoadedAll = true,
  textOnly = false,
}: LoadMoreProps) {
  if (hasMore) {
    // 纯文字模式
    if (textOnly) {
      const label = `显示${currentCount}条 / 共${totalCount}条，点击显示`;
      return (
        <div className="flex justify-center pt-2">
          {loading ? (
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              加载中...
            </span>
          ) : (
            <button
              type="button"
              onClick={onLoadMore}
              className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors cursor-pointer"
            >
              {label}
            </button>
          )}
        </div>
      );
    }

    // 默认按钮模式（向后兼容）
    const label =
      remaining && remaining > 0
        ? `剩余 ${remaining} 条未展示，点击显示`
        : idleText;

    return (
      <div className="flex justify-center pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onLoadMore}
          disabled={loading}
        >
          {loading && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
          {loading ? loadingText : label}
        </Button>
      </div>
    );
  }

  if (textOnly && totalCount > 0) {
    return (
      <div className="flex justify-center pt-2">
        <span className="text-sm text-muted-foreground">
          {loadedAllText !== '已显示全部'
            ? loadedAllText
            : `已显示全部${totalCount}篇文章`}
        </span>
      </div>
    );
  }

  if (showLoadedAll) {
    return (
      <div className="flex justify-center pt-2">
        <span className="text-sm text-muted-foreground/60">
          {loadedAllText}
        </span>
      </div>
    );
  }

  return null;
}
