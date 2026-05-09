'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Wrench, Archive } from 'lucide-react';
import {
  toggleMaintenanceMode,
  toggleDeployNotify,
} from '@/lib/actions/admin-actions';
import { AIConfigSection } from './ai-config-section';
import { IcpSection } from './icp-section';

interface Props {
  maintenanceMode: boolean;
  aiBaseUrl: string;
  aiApiKey: string;
  aiModel: string;
  aiModels: string[];
  icpNumber: string;
  icpVisible: boolean;
  showDeployNotify: boolean;
  apiKeySection: React.ReactNode;
}

export function AdminSections({
  maintenanceMode,
  aiBaseUrl,
  aiApiKey,
  aiModel,
  aiModels,
  icpNumber,
  icpVisible,
  showDeployNotify: initialShowDeployNotify,
  apiKeySection,
}: Props) {
  const router = useRouter();
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [showDeployNotify, setShowDeployNotify] = useState(
    initialShowDeployNotify,
  );
  const [deployNotifyLoading, setDeployNotifyLoading] = useState(false);

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

  return (
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
                  toast.success(checked ? '部署通知已开启' : '部署通知已关闭');
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
        <AIConfigSection
          initialAiBaseUrl={aiBaseUrl}
          initialAiApiKey={aiApiKey}
          initialAiModel={aiModel}
          initialAiModels={aiModels}
        />

        <Separator />

        {/* 本站 API Key */}
        {apiKeySection}

        <Separator />

        {/* ICP 备案 */}
        <IcpSection
          initialIcpNumber={icpNumber}
          initialIcpVisible={icpVisible}
        />

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
  );
}
