import type { ReactNode } from 'react'
import { Avatar } from '@/components/ui/avatar'

interface StatItem {
  icon: ReactNode
  label: string
  href?: string
}

export function AuthorCard({
  userId,
  displayName,
  avatarUrl,
  stats = [],
  actions,
}: {
  userId: string
  displayName: string
  avatarUrl?: string | null
  stats?: StatItem[]
  actions?: ReactNode
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
      <Avatar
        avatarUrl={avatarUrl}
        displayName={displayName}
        userId={userId}
        size="lg"
      />
      <div className="space-y-1 flex-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{displayName}</h1>
            <p className="text-xs text-muted-foreground">ID: {userId.slice(0, 8)}</p>
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
              )
              return stat.href ? (
                <a key={i} href={stat.href} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                  {content}
                </a>
              ) : (
                <span key={i} className="inline-flex items-center gap-1">
                  {content}
                </span>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
