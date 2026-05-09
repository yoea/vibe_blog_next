'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import {
  deleteAccount,
  logout,
  onAuthChange,
} from '@/lib/actions/auth-actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
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
  Sun,
  Moon,
  SunMoon,
  Heart,
  Wrench,
  Eye,
  EyeOff,
  ShieldCheck,
  Loader2,
  Archive,
  CheckCircle,
  AlertTriangle,
  Copy,
} from 'lucide-react';
import { useTheme, type ThemeMode } from '@/components/layout/theme-provider';
import { DonateButton } from '@/components/donate-button';
import {
  toggleMaintenanceMode,
  updateAIConfig,
  generateApiKey,
  deleteApiKey,
  updateICPConfig,
  toggleDeployNotify,
  saveAIModels,
} from '@/lib/actions/admin-actions';
import { copyToClipboard } from '@/lib/utils/clipboard';

interface Props {
  user: User;
  isAdmin?: boolean;
  maintenanceMode?: boolean;
  aiBaseUrl?: string;
  aiApiKey?: string;
  aiModel?: string;
  aiModels?: string[];
  icpNumber?: string;
  icpVisible?: boolean;
  showDeployNotify?: boolean;
  initialApiKey?: string;
}

export function SettingsForm({
  user,
  isAdmin,
  maintenanceMode,
  aiBaseUrl: initialAiBaseUrl,
  aiApiKey: initialAiApiKey,
  aiModel: initialAiModel,
  aiModels: initialAiModels,
  icpNumber: initialIcpNumber,
  icpVisible: initialIcpVisible,
  showDeployNotify: initialShowDeployNotify,
  initialApiKey,
}: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);
  const [aiBaseUrl, setAiBaseUrl] = useState(initialAiBaseUrl ?? '');
  const [aiApiKey, setAiApiKey] = useState(initialAiApiKey ?? '');
  const [aiModel, setAiModel] = useState(initialAiModel ?? '');
  const [showAiKey, setShowAiKey] = useState(false);
  const [customModels, setCustomModels] = useState<string[]>(
    initialAiModels ?? [],
  );
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [newModelInput, setNewModelInput] = useState('');
  const [aiTestResult, setAiTestResult] = useState<{
    loading: boolean;
    success?: boolean;
    models?: string[];
    error?: string;
  } | null>(null);
  const [dsBalance, setDsBalance] = useState<{ balance: string; currency: string } | null>(null);
  const [dsBalanceLoading, setDsBalanceLoading] = useState(false);
  const [dsBalanceError, setDsBalanceError] = useState(false);
  const [dsBalanceCooldown, setDsBalanceCooldown] = useState(false);
  const lastBalanceCheckRef = useRef(0);
  // 掩码本站 API Key（用于显示）
  function maskKeyForDisplay(key: string) {
    if (key.length <= 12) return key;
    return key.slice(0, 6) + '*'.repeat(Math.min(key.length - 10, 8)) + key.slice(-4);
  }
  const [apiKeyMasked, setApiKeyMasked] = useState<string | null>(
    initialApiKey ? maskKeyForDisplay(initialApiKey) : null,
  );
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');
  const [apiKeyLoading, setApiKeyLoading] = useState(false);

  const presetModels: string[] = [];

  const maskApiKey = (key: string) => {
    if (key.length <= 10) return key;
    const head = key.slice(0, 6);
    const tail = key.slice(-4);
    return head + '****' + tail;
  };
  const [icpNumber, setIcpNumber] = useState(initialIcpNumber ?? '');
  const [icpVisible, setIcpVisible] = useState(initialIcpVisible ?? false);
  const [icpSaving, setIcpSaving] = useState(false);
  const [showDeployNotify, setShowDeployNotify] = useState(
    initialShowDeployNotify ?? false,
  );
  const [deployNotifyLoading, setDeployNotifyLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [stickyHeader, setStickyHeader] = useState(false);

  useEffect(() => {
    setStickyHeader(localStorage.getItem('header_sticky') === 'true');
    // 如果当前模型不在自定义列表中，补充进去
    if (initialAiModel && !presetModels.includes(initialAiModel)) {
      setCustomModels((prev) =>
        prev.includes(initialAiModel) ? prev : [...prev, initialAiModel],
      );
    }
  }, []);
  const { mode, setMode } = useTheme();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    await onAuthChange();
    toast.success('已退出登录');
    window.location.href = '/login';
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    const { error } = await deleteAccount();
    setDeletingAccount(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success('账号已注销');
      router.push('/');
    }
  };

  const handleMaintenanceToggle = async () => {
    setMaintenanceLoading(true);
    const { error } = await toggleMaintenanceMode();
    setMaintenanceLoading(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success(maintenanceMode ? '维护模式已关闭' : '维护模式已开启');
      router.refresh();
    }
  };

  // 独立的连通性测试（保存后调用 或 手动点击"测试连接"）
  const runTestConnection = async () => {
    setAiTestResult({ loading: true });
    try {
      const res = await fetch('/api/test-ai-config', { method: 'POST' });
      const data = await res.json();
      setAiTestResult({
        loading: false,
        success: data.success,
        models: data.models,
        error: data.error,
      });
      if (data.success && data.models && data.models.length > 0) {
        // 与当前列表比对，仅新模型才合并
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
      setAiTestResult({
        loading: false,
        success: false,
        error: '测试请求失败',
      });
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
      fetchDsBalance(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveAIConfig = async () => {
    setAiSaving(true);
    setAiTestResult(null);
    const { error } = await updateAIConfig(aiBaseUrl, aiApiKey, aiModel);
    if (error) {
      setAiSaving(false);
      toast.error(error);
      return;
    }
    toast.success('AI 配置已保存');
    router.refresh();
    setAiSaving(false);

    // 保存成功后发起连通性测试
    await runTestConnection();
    // DeepSeek 余额查询
    if (aiBaseUrl === 'https://api.deepseek.com' && aiApiKey) {
      await fetchDsBalance();
    }
  };

  const handleGenerateApiKey = async () => {
    setApiKeyLoading(true);
    const result = await generateApiKey();
    setApiKeyLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (result.apiKey) {
      setGeneratedKey(result.apiKey);
      setShowKeyDialog(true);
    }
  };

  const handleDeleteApiKey = async () => {
    setApiKeyLoading(true);
    const result = await deleteApiKey();
    setApiKeyLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setShowKeyDialog(false);
    setApiKeyMasked(null);
    toast.success('API Key 已删除');
  };

  const handleSaveICP = async () => {
    setIcpSaving(true);
    const { error } = await updateICPConfig(icpNumber, icpVisible);
    setIcpSaving(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success('备案信息已保存');
      router.refresh();
    }
  };

  // 密码强度检查
  const strengthChecks = [
    { label: '至少 8 个字符', pass: newPassword.length >= 8 },
    { label: '包含大写字母', pass: /[A-Z]/.test(newPassword) },
    { label: '包含小写字母', pass: /[a-z]/.test(newPassword) },
    { label: '包含数字', pass: /\d/.test(newPassword) },
  ];
  const strength = strengthChecks.filter((c) => c.pass).length;

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast.error('新密码长度至少 8 个字符');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的密码不一致');
      return;
    }
    if (newPassword === currentPassword) {
      toast.error('新密码不能与当前密码相同');
      return;
    }

    setChangingPassword(true);
    const supabase = createClient();

    // 用当前密码重新验证身份
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });
    if (signInError) {
      setChangingPassword(false);
      toast.error('当前密码不正确');
      return;
    }

    // 标记：跳过 LoginToast 的 SIGNED_IN 监听（避免弹出"登录成功"）
    document.cookie = 'skip_login_toast=1; max-age=10; path=/';
    // 验证通过，更新密码
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setChangingPassword(false);

    if (updateError) {
      toast.error(updateError.message);
    } else {
      toast.success('密码修改成功');
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  const resetPasswordDialog = () => {
    setShowChangePassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const formatDate = (val: string | undefined) =>
    val ? new Date(val).toLocaleString('zh-CN') : '-';

  const displayName = user.email?.split('@')[0] ?? '';
  const isPasswordUser =
    user.app_metadata?.provider === 'email' ||
    (user.identities?.some((i) => i.provider === 'email') ?? false);

  return (
    <div className="space-y-6">
      {/* 个性化 */}
      <Card>
        <CardHeader>
          <CardTitle>主题</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {(['light', 'dark', 'system'] as ThemeMode[]).map((value) => {
              const Icon =
                value === 'system' ? SunMoon : value === 'dark' ? Moon : Sun;
              const label =
                value === 'system'
                  ? '跟随系统'
                  : value === 'dark'
                    ? '深色'
                    : '浅色';
              return (
                <button
                  key={value}
                  onClick={() => setMode(value)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    mode === value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>
          <Separator className="my-4" />
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium">固定导航栏</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                滚动页面时导航栏始终显示在顶部
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={stickyHeader}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setStickyHeader(checked);
                  localStorage.setItem('header_sticky', String(checked));
                  window.dispatchEvent(new Event('header-sticky-changed'));
                }}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-xs text-muted-foreground">
                {stickyHeader ? '已开启' : '已关闭'}
              </span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* 账户安全 */}
      {isPasswordUser && (
        <Card>
          <CardHeader>
            <CardTitle>账户安全</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => setShowChangePassword(true)}
              className="w-full sm:w-auto hover:border-foreground/30 hover:shadow-sm"
            >
              修改密码
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              验证当前密码后设置新密码。
            </p>
          </CardContent>
        </Card>
      )}

      {/* 账户操作 */}
      <Card>
        <CardHeader>
          <CardTitle>账户操作</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full sm:w-auto hover:border-foreground/30 hover:shadow-sm"
            >
              退出登录
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              退出登录后，你将返回主页
            </p>
          </div>
          <Separator />
          <div>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full sm:w-auto hover:bg-destructive/30 hover:shadow-sm"
            >
              注销账号
            </Button>
            <p className="text-xs text-muted-foreground mt-1">
              注销后你的文章和评论将被保留，仅用户信息匿名化
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 支持 */}
      <Card>
        <CardHeader>
          <CardTitle>支持</CardTitle>
        </CardHeader>
        <CardContent>
          <DonateButton>
            <Button
              variant="outline"
              className="w-full sm:w-auto hover:border-foreground/30 hover:shadow-sm"
            >
              <Heart className="h-4 w-4 mr-1.5 text-red-500" />
              给网站作者充电
            </Button>
          </DonateButton>
          <p className="text-xs text-muted-foreground mt-2">
            如果这个网站对你有帮助，可以请作者喝杯咖啡
          </p>
        </CardContent>
      </Card>

      {/* 站点管理 (admin only) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>站点管理</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 维护模式 */}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h4 className="text-sm font-medium">维护模式</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {maintenanceMode
                    ? '已开启，访客将看到维护页面'
                    : '开启后访客将看到维护页面，管理员可在维护页面点击结束维护'}
                </p>
              </div>
              <Button
                variant={maintenanceMode ? 'destructive' : 'outline'}
                size="sm"
                onClick={handleMaintenanceToggle}
                disabled={maintenanceLoading}
                className="shrink-0 hover:border-foreground/30 hover:shadow-sm"
              >
                <Wrench className="h-3.5 w-3.5 mr-1.5" />
                {maintenanceLoading
                  ? '处理中...'
                  : maintenanceMode
                    ? '关闭'
                    : '开启'}
              </Button>
            </div>

            <Separator />

            {/* 部署通知 */}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h4 className="text-sm font-medium">部署通知弹窗</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {showDeployNotify
                    ? '已开启，站点更新后用户首次访问将看到部署成功弹窗'
                    : '开启后，站点更新后用户首次访问将看到版本、构建时间等部署信息'}
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={showDeployNotify}
                  onChange={async (e) => {
                    const checked = e.target.checked;
                    setShowDeployNotify(checked);
                    setDeployNotifyLoading(true);
                    const { error } = await toggleDeployNotify();
                    setDeployNotifyLoading(false);
                    if (error) {
                      setShowDeployNotify(!checked);
                      toast.error(error);
                    } else {
                      toast.success(
                        checked ? '部署通知已开启' : '部署通知已关闭',
                      );
                      router.refresh();
                    }
                  }}
                  disabled={deployNotifyLoading}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-xs text-muted-foreground">
                  {showDeployNotify ? '已开启' : '已关闭'}
                </span>
              </label>
            </div>

            <Separator />

            {/* AI 大模型 */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">AI 大模型</h4>
              <p className="text-xs text-muted-foreground -mt-1">
                用于文章摘要生成、标签推荐等 AI 功能
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ai-base-url">API 地址</Label>
                  <Input
                    id="ai-base-url"
                    value={aiBaseUrl}
                    onChange={(e) => {
                      setAiBaseUrl(e.target.value);
                      setAiTestResult(null);
                    }}
                    placeholder="https://api.openai.com"
                  />
                  <div className="pt-1">
                    {aiTestResult ? (
                      aiTestResult.loading ? (
                        <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          正在测试连接...
                        </p>
                      ) : aiTestResult.success ? (
                        <p className="text-xs text-green-600 dark:text-green-400 inline-flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          连接成功
                          {aiTestResult.models &&
                            aiTestResult.models.length > 0 &&
                            `，获取到 ${aiTestResult.models.length} 个模型`}
                        </p>
                      ) : (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 inline-flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          连接失败：{aiTestResult.error || '未知错误'}
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
                            {newModelInput !== '' ||
                            customModels.length === 0 ? (
                              <input
                                type="text"
                                value={newModelInput}
                                onChange={(e) =>
                                  setNewModelInput(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (
                                    e.key === 'Enter' &&
                                    newModelInput.trim()
                                  ) {
                                    e.preventDefault();
                                    const name = newModelInput.trim();
                                    if (
                                      !presetModels.includes(name) &&
                                      !customModels.includes(name)
                                    ) {
                                      setCustomModels((prev) => [
                                        ...prev,
                                        name,
                                      ]);
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
                  <Label htmlFor="ai-api-key">API 密钥</Label>
                  <div className="relative">
                    <Input
                      id="ai-api-key"
                      type={showAiKey ? 'text' : 'password'}
                      value={maskApiKey(aiApiKey)}
                      onChange={(e) => {
                        setAiApiKey(e.target.value);
                        setAiTestResult(null);
                      }}
                      readOnly={!showAiKey}
                      placeholder="sk-..."
                      onFocus={(e) => {
                        if (showAiKey) {
                          e.target.select();
                        }
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
                  onClick={handleSaveAIConfig}
                  disabled={aiSaving}
                  className="shrink-0 mb-px hover:border-foreground/30 hover:shadow-sm"
                >
                  {aiSaving ? '保存中...' : '保存'}
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
                      <span className="text-[10px] opacity-60">{dsBalance.currency}</span>
                    </button>
                  ) : dsBalanceError ? (
                    <button
                      type="button"
                      onClick={() => fetchDsBalance(true)}
                      className="hover:text-foreground transition-colors cursor-pointer"
                    >
                      查询失败，点击重试
                    </button>
                  ) : null}
                </p>
              )}
            </div>

            <Separator />

            {/* 本站 API KEY — 用于 AI Agent 编程访问 */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">本站API KEY</h4>
              <p className="text-xs text-muted-foreground -mt-1">
                持有此 Key 即拥有超级管理员权限，可用于 AI Agent 通过 RESTful API 编程访问博客。
              </p>

              {apiKeyMasked ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <code className="text-sm font-mono bg-muted px-3 py-1.5 rounded select-all">
                    {apiKeyMasked}
                  </code>
                  <Button
                    variant="outline"
                    onClick={handleGenerateApiKey}
                    disabled={apiKeyLoading}
                    className="w-full sm:w-auto hover:border-foreground/30 hover:shadow-sm"
                  >
                    {apiKeyLoading ? '生成中...' : '重置密钥'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDeleteApiKey}
                    disabled={apiKeyLoading}
                    className="w-full sm:w-auto text-destructive hover:text-destructive hover:bg-red-50"
                  >
                    {apiKeyLoading ? '删除中...' : '删除密钥'}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleGenerateApiKey}
                  disabled={apiKeyLoading}
                  className="w-full sm:w-auto hover:border-foreground/30 hover:shadow-sm"
                >
                  {apiKeyLoading ? '生成中...' : '立即生成'}
                </Button>
              )}
            </div>

            <Separator />

            {/* ICP 备案 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">ICP 备案</h4>
                <label className="flex items-center gap-2 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={icpVisible}
                    onChange={async (e) => {
                      const checked = e.target.checked;
                      setIcpVisible(checked);
                      const { error } = await updateICPConfig(
                        icpNumber,
                        checked,
                      );
                      if (error) {
                        setIcpVisible(!checked);
                        toast.error(error);
                      } else {
                        toast.success(
                          checked ? '备案号已显示' : '备案号已隐藏',
                        );
                        router.refresh();
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-xs text-muted-foreground">
                    {icpVisible ? '已展示' : '已隐藏'}
                  </span>
                </label>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="icp-number">备案号</Label>
                  <Input
                    id="icp-number"
                    value={icpNumber}
                    onChange={(e) => setIcpNumber(e.target.value)}
                    placeholder="浙ICP备XXXXXXXX号-X"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveICP}
                  disabled={icpSaving}
                  className="shrink-0 mb-px hover:border-foreground/30 hover:shadow-sm"
                >
                  {icpSaving ? '保存中...' : '保存'}
                </Button>
              </div>
            </div>

            <Separator />

            {/* 归档文章管理 */}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h4 className="text-sm font-medium">归档文章管理</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  查看、搜索、恢复或永久删除已归档的文章
                </p>
              </div>
              <Link href="/admin/archive">
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 hover:border-foreground/30 hover:shadow-sm"
                >
                  <Archive className="h-3.5 w-3.5 mr-1.5" />
                  管理
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={showDeleteConfirm}
        onOpenChange={(open) => {
          if (!open) setDeleteConfirmEmail('');
          setShowDeleteConfirm(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>注销账号</DialogTitle>
            <DialogDescription>
              确定要注销账号吗？你的文章和评论将被保留，但用户信息将匿名化。此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label
              htmlFor="delete-confirm-email"
              className="text-sm select-text"
            >
              输入您的邮箱 {user.email} 以确认注销
            </Label>
            <Input
              id="delete-confirm-email"
              type="email"
              value={deleteConfirmEmail}
              onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              placeholder={user.email ?? 'you@example.com'}
              autoComplete="off"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteConfirmEmail('');
              }}
              disabled={deletingAccount}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deletingAccount || deleteConfirmEmail !== user.email}
            >
              {deletingAccount ? '注销中...' : '确认注销'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showChangePassword}
        onOpenChange={(open) => {
          if (!open) resetPasswordDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
            <DialogDescription>
              请先输入当前密码验证身份，然后设置新密码。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="current-pw">当前密码</Label>
              <div className="relative">
                <Input
                  id="current-pw"
                  type={showCurrentPw ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPw(!showCurrentPw)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showCurrentPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="new-pw">新密码</Label>
              <div className="relative">
                <Input
                  id="new-pw"
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPw(!showNewPw)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showNewPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {newPassword.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          i <= strength
                            ? strength <= 1
                              ? 'bg-red-400'
                              : strength <= 2
                                ? 'bg-yellow-400'
                                : strength <= 3
                                  ? 'bg-blue-400'
                                  : 'bg-green-500'
                            : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <ul className="space-y-0.5">
                    {strengthChecks.map((check) => (
                      <li
                        key={check.label}
                        className={`text-xs flex items-center gap-1 ${check.pass ? 'text-green-600' : 'text-muted-foreground'}`}
                      >
                        <ShieldCheck
                          className={`h-3 w-3 ${check.pass ? 'text-green-500' : 'opacity-30'}`}
                        />
                        {check.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-pw">确认新密码</Label>
              <Input
                id="confirm-pw"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
              {confirmPassword.length > 0 &&
                newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive">
                    两次输入的密码不一致
                  </p>
                )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={resetPasswordDialog}
              disabled={changingPassword}
            >
              取消
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={
                changingPassword ||
                newPassword.length < 8 ||
                newPassword !== confirmPassword
              }
            >
              {changingPassword && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {changingPassword ? '修改中...' : '确认修改'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Key 生成弹窗 */}
      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
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
                  setShowKeyDialog(false);
                  setApiKeyMasked(maskKeyForDisplay(generatedKey));
                }}
              >
                <Copy className="h-4 w-4" />
                复制
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
