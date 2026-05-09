'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { updateICPConfig } from '@/lib/actions/admin-actions';

interface Props {
  initialIcpNumber: string;
  initialIcpVisible: boolean;
}

export function IcpSection({ initialIcpNumber, initialIcpVisible }: Props) {
  const router = useRouter();
  const [icpNumber, setIcpNumber] = useState(initialIcpNumber);
  const [icpVisible, setIcpVisible] = useState(initialIcpVisible);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await updateICPConfig(icpNumber, icpVisible);
    setSaving(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success('备案信息已保存');
      router.refresh();
    }
  };

  return (
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
              const { error } = await updateICPConfig(icpNumber, checked);
              if (error) {
                setIcpVisible(!checked);
                toast.error(error);
              } else {
                toast.success(checked ? '备案号已显示' : '备案号已隐藏');
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
          onClick={handleSave}
          disabled={saving}
          className="shrink-0 mb-px hover:border-foreground/30 hover:shadow-sm"
        >
          {saving ? '保存中...' : '保存'}
        </Button>
      </div>
    </div>
  );
}
