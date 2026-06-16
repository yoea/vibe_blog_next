'use client';

import { useState, type ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Heart } from 'lucide-react';

const tabs = [
  {
    key: 'wechat',
    label: '微信支付',
    src: '/donate/wechat.jpg',
    alt: '微信收款码',
  },
  {
    key: 'alipay',
    label: '支付宝',
    src: '/donate/alipay.jpg',
    alt: '支付宝收款码',
  },
] as const;

export function DonateButton({ children }: { children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'wechat' | 'alipay'>('wechat');

  const current = tabs.find((t) => t.key === activeTab)!;

  return (
    <>
      <span className="inline-flex" onClick={() => setOpen(true)}>
        {children}
      </span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>给网站作者充电</DialogTitle>
          </DialogHeader>

          <div className="flex border-b">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 pb-2 pt-1 text-sm font-medium text-center transition-colors ${
                  activeTab === tab.key
                    ? 'text-foreground border-b-2 border-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex justify-center py-4 max-h-[60vh]">
            <img
              src={current.src}
              alt={current.alt}
              className="rounded-lg max-w-full max-h-[60vh] w-auto h-auto object-contain"
            />
          </div>

          <p className="text-center text-xs text-muted-foreground">
            扫描上方二维码向作者转账
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
