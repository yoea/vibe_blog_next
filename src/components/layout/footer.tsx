import Link from 'next/link';
import { Wrench } from 'lucide-react';

export function Footer({
  isMaintenance,
  icpNumber,
}: {
  isMaintenance?: boolean;
  icpNumber?: string;
}) {
  return (
    <footer className="border-t bg-background mt-auto">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-2 text-center sm:text-left">
          <p className="text-[10px] sm:text-[11px] text-muted-foreground">
            Copyright © {new Date().getFullYear()}{' '}
            <a
              href="https://github.com/yoea"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              <strong>Yoea</strong>
            </a>
            . All rights reserved.
            {isMaintenance && (
              <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 font-medium">
                <Wrench className="h-3 w-3" />
                <span>维护中</span>
              </span>
            )}
          </p>
          <nav
            className="flex items-center gap-2 text-[10px] sm:text-[11px] text-muted-foreground"
            aria-label="页脚导航"
            data-testid="footer-nav"
          >
            {icpNumber && (
              <>
                <a
                  href="https://beian.miit.gov.cn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors whitespace-nowrap"
                >
                  {icpNumber}
                </a>
                <span className="text-muted-foreground select-none">|</span>
              </>
            )}
            <Link
              href="/about"
              className="hover:text-foreground transition-colors"
            >
              关于
            </Link>
            <span className="text-muted-foreground select-none">|</span>
            <Link
              href="/privacy"
              className="hover:text-foreground transition-colors"
            >
              隐私政策
            </Link>
            <span className="text-muted-foreground select-none">|</span>
            <Link
              href="/legal"
              className="hover:text-foreground transition-colors"
            >
              法律信息
            </Link>
            <span className="text-muted-foreground select-none">|</span>
            <Link
              href="/sitemap"
              className="hover:text-foreground transition-colors"
            >
              网站地图
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
