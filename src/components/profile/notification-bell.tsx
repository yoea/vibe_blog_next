'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, X, Eye, CheckCheck } from 'lucide-react'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { formatTimeAgo } from '@/lib/utils/time'
import { getNotifications, markAsRead, dismissNotification, markAllAsRead } from '@/lib/actions/notification-actions'
import type { Notification, NotificationType } from '@/lib/db/types'

function getNotificationText(type: NotificationType, postTitle?: string | null): string {
  switch (type) {
    case 'post_like':
      return `点赞了你的文章`
    case 'post_comment':
      return `评论了你的文章`
    case 'guestbook_message':
      return '在你的主页留言了'
  }
}

function getNotificationLink(n: Notification): string {
  switch (n.type) {
    case 'post_like':
      return `/posts/${n.post_slug}`
    case 'post_comment':
      return `/posts/${n.post_slug}#comments`
    case 'guestbook_message':
      return `/author/${n.guestbook_author_id}?hl=${n.guestbook_message_id ?? ''}#guestbook`
  }
}

interface Props {
  initialUnreadCount: number
}

export function NotificationBell({ initialUnreadCount }: Props) {
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [initialLoaded, setInitialLoaded] = useState(false)

  const loadNotifications = useCallback(async (pageNum: number) => {
    setLoading(true)
    const result = await getNotifications(pageNum)
    if (result.data) {
      if (pageNum === 1) {
        setNotifications(result.data)
      } else {
        setNotifications(prev => {
          const existingIds = new Set(prev.map(n => n.id))
          const trulyNew = result.data!.filter(n => !existingIds.has(n.id))
          return [...prev, ...trulyNew]
        })
      }
      setTotal(result.total ?? 0)
      setPage(pageNum)
    }
    setLoading(false)
    setInitialLoaded(true)
  }, [])

  useEffect(() => {
    if (open && !initialLoaded) {
      loadNotifications(1)
    }
  }, [open, initialLoaded, loadNotifications])

  const handleDismiss = async (id: string, wasUnread: boolean) => {
    if (wasUnread) await markAsRead([id])
    await dismissNotification(id)
    setNotifications(prev => prev.filter(n => n.id !== id))
    setTotal(prev => prev - 1)
    if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const handleView = async (id: string, wasUnread: boolean) => {
    if (wasUnread) {
      await markAsRead([id])
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  const handleMarkAllRead = async () => {
    await markAllAsRead()
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  const hasMore = notifications.length < total

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative shrink-0 p-1.5 rounded-md hover:bg-accent transition-colors"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px] max-h-[85vh] sm:max-h-[70vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-10">
              <span>通知</span>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  全部已读
                </button>
              )}
            </DialogTitle>
          </DialogHeader>

          {initialLoaded && total > 0 && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground -mt-2">
              {unreadCount > 0 && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-500 font-medium">
                  未读 {unreadCount}
                </span>
              )}
              <span>共 {total} 条</span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-1 scrollbar-thin">
            {!initialLoaded || loading && notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">加载中...</div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">暂无通知</div>
            ) : (
              <>
                {notifications.map(n => (
                  <Link
                    key={n.id}
                    href={getNotificationLink(n)}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('[data-action]')) return
                      handleView(n.id, !n.is_read)
                      setOpen(false)
                    }}
                    className={`flex items-start gap-3 py-3 border-b border-border/50 last:border-0 cursor-pointer hover:bg-accent/50 transition-colors ${!n.is_read ? 'bg-accent/30 -mx-2 px-2 rounded-md' : 'opacity-60'}`}
                  >
                    <Avatar
                      avatarUrl={n.actor_avatar_url}
                      displayName={n.actor_name ?? '匿名用户'}
                      userId={n.actor_id ?? 'guest'}
                      size="xs"
                      className="mt-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="text-sm">
                        <span className="font-medium">{n.actor_name ?? '匿名用户'}</span>
                        <span className="text-muted-foreground ml-1">{getNotificationText(n.type, n.post_title)}</span>
                      </div>
                      {n.post_title && (
                        <p className="text-xs text-muted-foreground truncate">{n.post_title}</p>
                      )}
                      {n.type === 'guestbook_message' && n.guestbook_message_content && (
                        <p className="text-xs text-muted-foreground truncate">{n.guestbook_message_content}</p>
                      )}
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-[11px] text-muted-foreground/60" suppressHydrationWarning>{formatTimeAgo(n.created_at)}</span>
                        <div className="flex-1" />
                        <button
                          data-action
                          onClick={(e) => { e.stopPropagation(); handleDismiss(n.id, !n.is_read) }}
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="忽略"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <span
                          data-action
                          onClick={(e) => { e.stopPropagation(); handleView(n.id, !n.is_read); setOpen(false) }}
                          className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                          title="去查看"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}

                {hasMore ? (
                  <div className="flex justify-center py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => loadNotifications(page + 1)}
                      disabled={loading}
                    >
                      {loading ? '加载中...' : '加载更多'}
                    </Button>
                  </div>
                ) : (
                  <div className="py-3 text-center text-[11px] text-muted-foreground/50">
                    已显示全部 {total} 条通知
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
