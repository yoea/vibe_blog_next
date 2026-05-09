'use client';

import { useState } from 'react';
import { Sun, Moon, SunMoon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useTheme, type ThemeMode } from '@/components/layout/theme-provider';

export function ThemeSection() {
  const { mode, setMode } = useTheme();
  const [stickyHeader, setStickyHeader] = useState(
    () => localStorage.getItem('header_sticky') === 'true',
  );

  return (
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
  );
}
