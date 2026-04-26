'use client'

import { useState } from 'react'
import Image from 'next/image'
import { getUserColor } from '@/lib/utils/colors'
import { cn } from '@/lib/utils'

interface AvatarProps {
  avatarUrl?: string | null
  displayName?: string | null
  userId: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeMap = {
  xs: { px: 24, fontSize: 'text-xs' },
  sm: { px: 32, fontSize: 'text-sm' },
  md: { px: 40, fontSize: 'text-base' },
  lg: { px: 48, fontSize: 'text-lg' },
  xl: { px: 64, fontSize: 'text-xl' },
}

export function Avatar({ avatarUrl, displayName, userId, size = 'md', className }: AvatarProps) {
  const [imgError, setImgError] = useState(false)
  const { px, fontSize } = sizeMap[size]
  const initial = (displayName ?? userId).charAt(0).toUpperCase()
  const bgColor = getUserColor(userId)

  if (avatarUrl && !imgError) {
    return (
      <div
        className={cn('relative rounded-full overflow-hidden shrink-0', className)}
        style={{ width: px, height: px }}
      >
        <Image
          src={avatarUrl}
          alt={displayName ?? 'avatar'}
          width={px * 2}
          height={px * 2}
          className="object-cover w-full h-full"
          onError={() => setImgError(true)}
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-bold text-white shrink-0 select-none',
        fontSize,
        className
      )}
      style={{ width: px, height: px, backgroundColor: bgColor }}
    >
      {initial}
    </div>
  )
}
