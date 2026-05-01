import type { ReactNode } from 'react';
import { Shield } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';

interface StatItem {
  icon: ReactNode;
  label: string;
  href?: string;
}

export function AuthorCard({
  userId,
  displayName,
  avatarUrl,
  stats = [],
  actions,
  isAdmin,
}: {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  stats?: StatItem[];
  actions?: ReactNode;
  isAdmin?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
      <Avatar
        avatarUrl={avatarUrl}
        displayName={displayName}
        userId={userId}
        size="lg"
        previewable
      />
      <div className="space-y-1 flex-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              {displayName}
              {isAdmin && (
                <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground/60 border rounded px-1.5 py-0.5">
                  <Shield className="h-3 w-3" />
                  管理员
                </span>
              )}
            </h1>
            <p className="text-xs text-muted-foreground">
              ID: {userId.slice(0, 8)}
            </p>
          </div>
          {actions}
        </div>
        {stats.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {stats.map((stat, i) => {
              const content = (
                <>
                  {stat.icon}
                  {stat.label}
                </>
              );
              return stat.href ? (
                <a
                  key={i}
                  href={stat.href}
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  {content}
                </a>
              ) : (
                <span key={i} className="inline-flex items-center gap-1">
                  {content}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
