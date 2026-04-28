'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { getUserColor } from '@/lib/utils/colors'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'

export interface AvatarProps {
  avatarUrl?: string | null
  displayName?: string | null
  userId: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
  previewable?: boolean
  /** 延迟加载头像图片，先显示 fallback 再异步加载，适合列表页批量使用 */
  defer?: boolean
}

const sizeMap = {
  xs: { px: 24, fontSize: 'text-xs' },
  sm: { px: 32, fontSize: 'text-sm' },
  md: { px: 40, fontSize: 'text-base' },
  lg: { px: 48, fontSize: 'text-lg' },
  xl: { px: 64, fontSize: 'text-xl' },
  '2xl': { px: 80, fontSize: 'text-2xl' },
}

export function Avatar({ avatarUrl, displayName, userId, size = 'md', className, previewable, defer }: AvatarProps) {
  const [imgError, setImgError] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [showImage, setShowImage] = useState(!defer)
  const mountedRef = useRef(false)
  const { px, fontSize } = sizeMap[size]
  const initial = (displayName ?? userId).charAt(0).toUpperCase()
  const bgColor = getUserColor(userId)

  useEffect(() => {
    mountedRef.current = true
    if (defer && avatarUrl) {
      const id = requestAnimationFrame(() => {
        if (mountedRef.current) setShowImage(true)
      })
      return () => cancelAnimationFrame(id)
    }
  }, [defer, avatarUrl])

  const shouldShowImage = avatarUrl && !imgError && showImage
  const showPreview = previewable && avatarUrl && !imgError

  const avatarContent = shouldShowImage ? (
    <div
      className={cn(
        'relative rounded-full overflow-hidden shrink-0',
        showPreview && 'cursor-pointer',
        className
      )}
      style={{ width: px, height: px }}
      onClick={showPreview ? () => setPreviewOpen(true) : undefined}
      role={showPreview ? 'button' : undefined}
      tabIndex={showPreview ? 0 : undefined}
      onKeyDown={showPreview ? (e) => { if (e.key === 'Enter' || e.key === ' ') setPreviewOpen(true) } : undefined}
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
  ) : (
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

  return (
    <>
      {avatarContent}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-lg p-2">
          <div className="flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl!}
              alt={displayName ?? 'avatar'}
              className="object-contain rounded-lg max-h-[80vh] w-auto h-auto"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
