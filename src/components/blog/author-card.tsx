import type { ReactNode } from 'react'
import { getUserColor } from '@/lib/utils/colors'

interface StatItem {
  icon: ReactNode
  label: string
  href?: string
}

export function AuthorCard({
  userId,
  displayName,
  stats = [],
  actions,
}: {
  userId: string
  displayName: string
  stats?: StatItem[]
  actions?: ReactNode
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
      <div
        className="flex items-center justify-center w-12 h-12 rounded-full text-lg font-bold text-white shrink-0"
        style={{ backgroundColor: getUserColor(userId) }}
      >
        {displayName[0]}
      </div>
      <div className="space-y-1 flex-1">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{displayName}</h1>
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
