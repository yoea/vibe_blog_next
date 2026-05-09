'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { updateAIConfig, saveAIModels } from '@/lib/actions/admin-actions';
import { maskApiKey } from './mask-utils';

interface Props {
  initialAiBaseUrl: string;
  initialAiApiKey: string;
  initialAiModel: string;
  initialAiModels: string[];
}

export function AIConfigSection({
  initialAiBaseUrl,
  initialAiApiKey,
  initialAiModel,
  initialAiModels,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [aiBaseUrl, setAiBaseUrl] = useState(initialAiBaseUrl);
  const [aiApiKey, setAiApiKey] = useState(initialAiApiKey);
  const [aiModel, setAiModel] = useState(initialAiModel);
  const [showAiKey, setShowAiKey] = useState(false);
  const [customModels, setCustomModels] = useState<string[]>(() => {
    if (initialAiModel && !initialAiModels.includes(initialAiModel)) {
      return [...initialAiModels, initialAiModel];
    }
    return initialAiModels;
  });
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [newModelInput, setNewModelInput] = useState('');
  const [testResult, setTestResult] = useState<{
    loading: boolean;
    success?: boolean;
    models?: string[];
    error?: string;
  } | null>(null);
  const [dsBalance, setDsBalance] = useState<{
    balance: string;
    currency: string;
  } | null>(null);
  const [dsBalanceLoading, setDsBalanceLoading] = useState(false);
  const [dsBalanceError, setDsBalanceError] = useState(false);
  const [dsBalanceCooldown, setDsBalanceCooldown] = useState(false);
  const lastBalanceCheckRef = useRef(0);

  const presetModels: string[] = [];

  // 保存后自动测试连接
  const runTestConnection = async () => {
    setTestResult({ loading: true });
    try {
      const res = await fetch('/api/test-ai-config', { method: 'POST' });
      const data = await res.json();
      setTestResult({
        loading: false,
        success: data.success,
        models: data.models,
        error: data.error,
      });
      if (data.success && data.models && data.models.length > 0) {
        const newModels = data.models.filter(
          (m: string) => !presetModels.includes(m) && !customModels.includes(m),
        );
        if (newModels.length > 0) {
          const merged = [...customModels, ...newModels];
          setCustomModels(merged);
          saveAIModels(merged).catch(() => {});
        }
      }
    } catch {
      setTestResult({ loading: false, success: false, error: '测试请求失败' });
    }
  };

  const fetchDsBalance = async (ignoreCooldown = false) => {
    if (aiBaseUrl !== 'https://api.deepseek.com' || !aiApiKey) return;
    if (dsBalanceLoading) return;
    if (!ignoreCooldown && Date.now() - lastBalanceCheckRef.current < 60000) {
      setDsBalanceCooldown(true);
      return;
    }
    setDsBalanceCooldown(true);
    lastBalanceCheckRef.current = Date.now();
    setDsBalanceLoading(true);
    setDsBalanceError(false);
    try {
      const res = await fetch('/api/check-deepseek-balance');
      const data = await res.json();
      if (data.error) {
        setDsBalanceError(true);
        setDsBalance(null);
      } else {
        setDsBalance(data);
        setDsBalanceError(false);
      }
    } catch {
      setDsBalanceError(true);
    }
    setDsBalanceLoading(false);
  };

  useEffect(() => {
    if (aiBaseUrl === 'https://api.deepseek.com' && aiApiKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchDsBalance(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setTestResult(null);
    const { error } = await updateAIConfig(aiBaseUrl, aiApiKey, aiModel);
    if (error) {
      setSaving(false);
      toast.error(error);
      return;
    }
    toast.success('AI 配置已保存');
    router.refresh();
    setSaving(false);

    await runTestConnection();
    if (aiBaseUrl === 'https://api.deepseek.com' && aiApiKey) {
      await fetchDsBalance();
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">AI 大模型</h4>
      <p className="text-xs text-muted-foreground -mt-1">
        用于文章摘要生成、标签推荐等 AI 功能
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ai-base-url">Base Url</Label>
          <Input
            id="ai-base-url"
            value={aiBaseUrl}
            onChange={(e) => {
              setAiBaseUrl(e.target.value);
              setTestResult(null);
            }}
            placeholder="https://api.openai.com"
          />
          <div className="pt-1">
            {testResult ? (
              testResult.loading ? (
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  正在测试连接...
                </p>
              ) : testResult.success ? (
                <p className="text-xs text-green-600 dark:text-green-400 inline-flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  连接成功
                  {testResult.models &&
                    testResult.models.length > 0 &&
                    `，获取到 ${testResult.models.length} 个模型`}
                </p>
              ) : (
                <p className="text-xs text-yellow-600 dark:text-yellow-400 inline-flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  连接失败：{testResult.error || '未知错误'}
                </p>
              )
            ) : (
              <button
                type="button"
                onClick={runTestConnection}
                className="text-xs text-primary hover:underline cursor-pointer"
              >
                测试连接
              </button>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ai-model">模型列表</Label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <span className={aiModel ? '' : 'text-muted-foreground'}>
                {aiModel || '选择模型...'}
              </span>
              <svg
                className="h-4 w-4 opacity-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {showModelDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowModelDropdown(false)}
                />
                <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md">
                  <div className="max-h-48 overflow-y-auto py-1">
                    {presetModels.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setAiModel(m);
                          setShowModelDropdown(false);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-1.5 text-sm hover:bg-accent ${
                          aiModel === m ? 'font-medium' : ''
                        }`}
                      >
                        <span>{m}</span>
                      </button>
                    ))}
                    {customModels.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          setAiModel(m);
                          setShowModelDropdown(false);
                        }}
                        className={`flex w-full items-center justify-between px-3 py-1.5 text-sm hover:bg-accent ${
                          aiModel === m ? 'font-medium' : ''
                        }`}
                      >
                        <span className="truncate">{m}</span>
                        <span
                          className="ml-2 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCustomModels((prev) =>
                              prev.filter((x) => x !== m),
                            );
                            if (aiModel === m) setAiModel('');
                          }}
                          title="删除此模型"
                        >
                          ×
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="border-t px-2 py-1.5">
                    {newModelInput !== '' || customModels.length === 0 ? (
                      <input
                        type="text"
                        value={newModelInput}
                        onChange={(e) => setNewModelInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newModelInput.trim()) {
                            e.preventDefault();
                            const name = newModelInput.trim();
                            if (
                              !presetModels.includes(name) &&
                              !customModels.includes(name)
                            ) {
                              setCustomModels((prev) => [...prev, name]);
                              setAiModel(name);
                            }
                            setNewModelInput('');
                            setShowModelDropdown(false);
                          }
                          if (e.key === 'Escape') {
                            setNewModelInput('');
                            setShowModelDropdown(false);
                          }
                        }}
                        placeholder="输入模型名称，按回车添加..."
                        className="flex h-8 w-full rounded border border-input bg-transparent px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        autoComplete="off"
                        data-1p-ignore
                        autoFocus
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setNewModelInput(' ')}
                        className="flex w-full items-center px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent"
                      >
                        + 自定义...
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            当前使用：{initialAiModel || '未设置'}
          </p>
        </div>
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="ai-api-key">大模型 API 密钥</Label>
          <div className="relative">
            <Input
              id="ai-api-key"
              type={showAiKey ? 'text' : 'password'}
              value={maskApiKey(aiApiKey)}
              onChange={(e) => {
                setAiApiKey(e.target.value);
                setTestResult(null);
              }}
              readOnly={!showAiKey}
              placeholder="sk-..."
              onFocus={(e) => {
                if (showAiKey) e.target.select();
              }}
            />
            <button
              type="button"
              onClick={() => setShowAiKey(!showAiKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              title={showAiKey ? '取消编辑' : '编辑密钥（粘贴新密钥）'}
            >
              {showAiKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={saving}
          className="shrink-0 mb-px hover:border-foreground/30 hover:shadow-sm"
        >
          {saving ? '保存中...' : '保存'}
        </Button>
      </div>
      {/* DeepSeek 余额查询 */}
      {aiBaseUrl === 'https://api.deepseek.com' && (
        <p className="text-xs text-muted-foreground">
          Deepseek 余额：
          {dsBalanceLoading ? (
            <span className="inline-flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              查询中...
            </span>
          ) : dsBalance ? (
            <button
              type="button"
              onClick={() => fetchDsBalance()}
              disabled={dsBalanceCooldown}
              title="当前显示的为可用充值余额，点击刷新"
              className="hover:text-foreground transition-colors cursor-pointer disabled:cursor-default"
            >
              {dsBalance.currency === 'CNY' ? '¥' : '$'}
              {dsBalance.balance}{' '}
              <span className="text-[10px] opacity-60">
                {dsBalance.currency}
              </span>
            </button>
          ) : dsBalanceError ? (
            <button
              type="button"
              onClick={() => fetchDsBalance(true)}
              className="hover:text-foreground transition-colors cursor-pointer"
            >
              查询失败，请稍后重试
            </button>
          ) : null}
        </p>
      )}
    </div>
  );
}
