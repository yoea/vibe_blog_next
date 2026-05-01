'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toggleMaintenanceMode } from '@/lib/actions/admin-actions';
import { Button } from '@/components/ui/button';

export function MaintenanceClient({
  isAdmin,
  isMaintenanceOn,
}: {
  isAdmin: boolean;
  isMaintenanceOn: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    const { error } = await toggleMaintenanceMode();
    setLoading(false);
    if (error) {
      alert(error);
    } else {
      setDone(true);
      location.reload();
    }
  };

  return (
    <div className="mt-6 space-y-3">
      <div
        className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${
          isMaintenanceOn
            ? 'bg-accent text-primary'
            : 'bg-green-500/10 text-green-600'
        }`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full animate-pulse ${
            isMaintenanceOn ? 'bg-primary/60' : 'bg-green-500'
          }`}
        />
        {isMaintenanceOn ? '维护模式已开启' : '维护模式已关闭'}
      </div>

      {isAdmin && (
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
            disabled={loading}
          >
            {loading
              ? isMaintenanceOn
                ? '关闭中...'
                : '开启中...'
              : done
                ? isMaintenanceOn
                  ? '已关闭'
                  : '已开启'
                : isMaintenanceOn
                  ? '关闭维护模式'
                  : '手动进入维护模式'}
          </Button>
        </div>
      )}

      {!isMaintenanceOn && !isAdmin && (
        <div className="pt-2">
          <Link href="/" className="text-sm text-primary hover:underline">
            返回首页
          </Link>
        </div>
      )}
    </div>
  );
}
