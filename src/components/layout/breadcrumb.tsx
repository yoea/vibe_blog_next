import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav
      className="flex items-center gap-1 text-xs sm:text-sm text-muted-foreground overflow-hidden whitespace-nowrap"
      aria-label="面包屑导航"
      data-testid="breadcrumb"
    >
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1 shrink-0">
          {i > 0 && (
            <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
          )}
          {item.href ? (
            <Link
              href={item.href}
              className="truncate hover:text-foreground transition-colors max-w-[120px] sm:max-w-[200px]"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium truncate max-w-[120px] sm:max-w-[200px]">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
