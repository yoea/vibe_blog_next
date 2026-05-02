'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  RotateCcw,
  Trash2,
  Search,
  Archive,
  User,
  Calendar,
} from 'lucide-react';
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
import {
  restorePost,
  permanentlyDeleteArchive,
} from '@/lib/actions/archive-actions';
import type { ArchivedPostWithAuthor } from '@/lib/db/types';

interface Props {
  archives: ArchivedPostWithAuthor[];
  total: number;
  page: number;
  search: string;
}

export function ArchiveList({ archives, total, page, search }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [restoreTarget, setRestoreTarget] =
    useState<ArchivedPostWithAuthor | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<ArchivedPostWithAuthor | null>(null);
  const [searchValue, setSearchValue] = useState(search);

  const pageSize = 20;
  const totalPages = Math.ceil(total / pageSize);

  const handleRestore = () => {
    if (!restoreTarget) return;
    startTransition(async () => {
      const result = await restorePost(restoreTarget.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('文章已恢复');
        setRestoreTarget(null);
        router.refresh();
      }
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    startTransition(async () => {
      const result = await permanentlyDeleteArchive(deleteTarget.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('已永久删除');
        setDeleteTarget(null);
        router.refresh();
      }
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchValue.trim();
    router.push(
      q ? `/admin/archive?q=${encodeURIComponent(q)}` : '/admin/archive',
    );
  };

  return (
    <div className="space-y-4">
      {/* 搜索栏 */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="搜索文章标题..."
            className="w-full pl-10 pr-3 py-2 rounded-md border bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button type="submit" variant="outline" size="sm">
          搜索
        </Button>
        {search && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchValue('');
              router.push('/admin/archive');
            }}
          >
            清除
          </Button>
        )}
      </form>

      {/* 统计 */}
      <div className="text-sm text-muted-foreground">
        共 {total} 篇归档文章{search ? `（搜索"${search}"）` : ''}
      </div>

      {/* 列表 */}
      {archives.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Archive className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>{search ? '没有找到匹配的归档文章' : '暂无归档文章'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-3 py-2.5 font-medium">标题</th>
                <th className="text-left px-3 py-2.5 font-medium hidden sm:table-cell">
                  作者
                </th>
                <th className="text-left px-3 py-2.5 font-medium hidden md:table-cell">
                  Slug
                </th>
                <th className="text-left px-3 py-2.5 font-medium hidden sm:table-cell">
                  归档日期
                </th>
                <th className="text-right px-3 py-2.5 font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {archives.map((post) => (
                <tr
                  key={post.id}
                  className="hover:bg-accent/30 transition-colors"
                >
                  <td className="px-3 py-2.5">
                    <span className="line-clamp-1 font-medium">
                      {post.title}
                    </span>
                    {/* 移动端：内联显示作者和日期 */}
                    <span className="sm:hidden flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {post.author_name ?? '未知'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(post.archived_at).toLocaleDateString('zh-CN')}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                    {post.author_name ?? '未知'}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground font-mono text-xs hidden md:table-cell max-w-[160px] truncate">
                    {post.slug}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                    {new Date(post.archived_at).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 cursor-pointer"
                        onClick={() => setRestoreTarget(post)}
                        title="恢复"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">恢复</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 cursor-pointer text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(post)}
                        title="删除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">删除</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() =>
              router.push(
                `/admin/archive?page=${page - 1}${search ? `&q=${encodeURIComponent(search)}` : ''}`,
              )
            }
          >
            上一页
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() =>
              router.push(
                `/admin/archive?page=${page + 1}${search ? `&q=${encodeURIComponent(search)}` : ''}`,
              )
            }
          >
            下一页
          </Button>
        </div>
      )}

      {/* 恢复确认弹窗 */}
      <Dialog
        open={!!restoreTarget}
        onOpenChange={(o) => {
          if (!o) setRestoreTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>恢复文章</DialogTitle>
            <DialogDescription>
              确定要恢复「{restoreTarget?.title}
              」吗？文章将重新出现在公开列表中。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRestoreTarget(null)}
              disabled={isPending}
            >
              取消
            </Button>
            <Button onClick={handleRestore} disabled={isPending}>
              {isPending ? '恢复中...' : '确认恢复'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 永久删除确认弹窗 */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>永久删除</DialogTitle>
            <DialogDescription>
              确定要永久删除「{deleteTarget?.title}
              」吗？此操作不可撤销，文章内容将永久丢失。
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
              {isPending ? '删除中...' : '永久删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
