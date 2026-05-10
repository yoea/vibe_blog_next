'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  generateApiKey,
  deleteApiKey,
  listApiKeys,
} from '@/lib/actions/admin-actions';
import { copyToClipboard } from '@/lib/utils/clipboard';
import { Plus, Trash2, Copy, Loader2 } from 'lucide-react';

type KeyInfo = {
  id: string;
  name: string;
  key_prefix: string;
  key_suffix: string;
  created_at: string;
  last_used_at: string | null;
};

export function ApiKeyManager() {
  const [keys, setKeys] = useState<KeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<KeyInfo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadKeys = useCallback(async () => {
    const result = await listApiKeys();
    if (result.error) {
      toast.error(result.error);
    } else {
      setKeys(result.keys ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadKeys();
  }, [loadKeys]);

  const handleGenerate = async () => {
    setGenerating(true);
    const result = await generateApiKey(newKeyName.trim() || undefined);
    setGenerating(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (result.apiKey) {
      setGeneratedKey(result.apiKey);
      setShowCreateDialog(false);
      setNewKeyName('');
      setShowNewKeyDialog(true);
      loadKeys();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteApiKey(deleteTarget.id);
    setDeleting(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('密钥已删除');
      setKeys((prev) => prev.filter((k) => k.id !== deleteTarget.id));
      setDeleteTarget(null);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '从未使用';
    return new Date(date).toLocaleString('zh-CN');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>本站 API Key</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            持有此 Key 可用于 AI Agent 通过 MCP 或 RESTful API 访问博客。
          </p>
          <Button
            size="sm"
            onClick={() => setShowCreateDialog(true)}
            className="shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="ml-1">生成密钥</span>
          </Button>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground">加载中...</p>
        ) : keys.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            暂无密钥，点击「生成密钥」创建。
          </p>
        ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-md border bg-muted/30 px-3 py-2"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {key.name}
                  </span>
                  <code className="text-xs font-mono text-muted-foreground select-all">
                    {key.key_prefix}****{key.key_suffix}
                  </code>
                </div>
                <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
                  <span>创建：{formatDate(key.created_at)}</span>
                  <span>最后使用：{formatDate(key.last_used_at)}</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 text-destructive hover:text-destructive hover:bg-red-50 text-xs"
                onClick={() => setDeleteTarget(key)}
              >
                <Trash2 className="h-3 w-3" />
                <span className="ml-1">删除</span>
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* 创建密钥命名弹窗 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>生成 API Key</DialogTitle>
            <DialogDescription>
              为此密钥命名，方便区分不同用途。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="key-name">名称</Label>
            <Input
              id="key-name"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="默认密钥"
              maxLength={30}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleGenerate();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={generating}
            >
              取消
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? '生成中...' : '确认生成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 新密钥展示弹窗 */}
      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>API Key 已生成</DialogTitle>
            <DialogDescription>
              请立即复制并妥善保管，关闭后无法再次查看完整 Key。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <code className="block text-sm font-mono bg-muted px-3 py-2 rounded break-all select-all">
              {generatedKey}
            </code>
            <DialogFooter>
              <Button
                onClick={async () => {
                  await copyToClipboard(generatedKey);
                  toast.success('已复制到剪贴板');
                  setShowNewKeyDialog(false);
                }}
              >
                <Copy className="h-4 w-4" />
                复制
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除 API Key</DialogTitle>
            <DialogDescription>
              确定删除密钥「{deleteTarget?.name}
              」？此操作不可撤销，使用此密钥的服务将立即失效。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  删除中...
                </>
              ) : (
                '确认删除'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </CardContent>
    </Card>
  );
}
