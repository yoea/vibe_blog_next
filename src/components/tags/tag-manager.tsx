'use client';

import { useState, useTransition, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createTag, deleteTag } from '@/lib/actions/post-actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Hash, TrendingUp } from 'lucide-react';
import type { TagWithCreator } from '@/lib/db/queries';

type SortKey = 'name' | 'post_count';

const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ElementType }[] =
  [
    { key: 'name', label: '名称', icon: Hash },
    { key: 'post_count', label: '引用次数', icon: TrendingUp },
  ];

interface Props {
  initialTags: TagWithCreator[];
  currentUserId: string | null;
  isAdmin: boolean;
  showCreate?: boolean;
}

export function TagManager({
  initialTags,
  currentUserId,
  isAdmin,
  showCreate = true,
}: Props) {
  const [tags, setTags] = useState(initialTags);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<TagWithCreator | null>(null);
  const [isPending, startTransition] = useTransition();
  const [sortBy, setSortBy] = useState<SortKey>('post_count');
  const router = useRouter();

  useEffect(() => {
    setTags(initialTags);
  }, [initialTags]);

  const sortedTags = useMemo(() => {
    const copy = [...tags];
    switch (sortBy) {
      case 'post_count':
        return copy.sort((a, b) => b.post_count - a.post_count);
      case 'name':
        return copy.sort((a, b) => {
          const aIsEn = /^[a-zA-Z]/.test(a.name);
          const bIsEn = /^[a-zA-Z]/.test(b.name);
          if (aIsEn && !bIsEn) return -1;
          if (!aIsEn && bIsEn) return 1;
          return a.name.localeCompare(b.name, 'zh-CN');
        });
      default:
        return copy;
    }
  }, [tags, sortBy]);

  const totalPosts = useMemo(
    () => tags.reduce((sum, t) => sum + t.post_count, 0),
    [tags],
  );

  const handleCreate = () => {
    const name = newTagName.trim();
    if (!name) {
      toast.error('请输入标签名');
      return;
    }

    startTransition(async () => {
      const result = await createTag(name);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('标签已创建');
        setShowCreateDialog(false);
        setNewTagName('');
        router.refresh();
      }
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;

    startTransition(async () => {
      const result = await deleteTag(deleteTarget.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('标签已删除');
        setTags((prev) => prev.filter((t) => t.id !== deleteTarget.id));
        setDeleteTarget(null);
        router.refresh();
      }
    });
  };

  if (!tags.length) {
    return (
      <div className="space-y-4">
        {currentUserId && showCreate && (
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4" />
              新建标签
            </Button>
          </div>
        )}
        <div className="text-center py-12 text-muted-foreground">
          <p>暂无标签</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats + controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{tags.length} 个标签</span>
          <span className="text-border">|</span>
          <span>共引用 {totalPosts} 次</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-1 border rounded-md p-0.5">
            {SORT_OPTIONS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm sm:text-xs transition-colors cursor-pointer ${
                  sortBy === key
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4 sm:h-3 sm:w-3" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          {currentUserId && showCreate && (
            <Button
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              className="text-sm sm:text-xs"
            >
              <Plus className="h-4 w-4 sm:h-3 sm:w-3" />
              <span className="ml-1">新建</span>
            </Button>
          )}
        </div>
      </div>

      {/* Tag list */}
      <div className="flex flex-wrap gap-2 sm:gap-3">
        {sortedTags.map((tag) => {
          const isOwner =
            tag.created_by !== null && currentUserId === tag.created_by;
          const canDelete = isOwner || isAdmin;
          const creatorLabel = tag.author_name ?? tag.author_email ?? '';
          return (
            <div
              key={tag.id}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border hover:shadow-sm transition-shadow"
              title={creatorLabel ? `创建者: ${creatorLabel}` : undefined}
            >
              <Link
                href={`/tags/${encodeURIComponent(tag.slug)}`}
                className="text-[13px] sm:text-sm font-medium hover:underline"
                style={{ color: tag.color }}
              >
                {tag.name}
              </Link>
              <span className="hidden sm:inline text-xs text-muted-foreground">
                ({tag.post_count})
              </span>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => setDeleteTarget(tag)}
                  className="p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                  title="删除标签"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Create dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建标签</DialogTitle>
            <DialogDescription>输入新标签的名称</DialogDescription>
          </DialogHeader>
          <input
            autoFocus
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') setShowCreateDialog(false);
            }}
            placeholder="标签名"
            maxLength={50}
            className="w-full px-3 py-2 rounded-md border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isPending}
            >
              取消
            </Button>
            <Button
              onClick={handleCreate}
              disabled={isPending || !newTagName.trim()}
            >
              {isPending ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除标签</DialogTitle>
            <DialogDescription>
              确定删除标签「{deleteTarget?.name}
              」？此操作将从所有包含此标签的文章中移除该标签，不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
            >
              {isPending ? '删除中...' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
