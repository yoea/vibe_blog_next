'use client'

import { useState } from 'react'
import type { ThreadedItemBase } from '@/lib/db/types'

interface ThreadedItem extends ThreadedItemBase {
  replies?: this[]
}

interface UseThreadedListOptions<T extends ThreadedItem> {
  initialItems: T[]
  initialTotal: number
  onSubmit: (content: string, parentId?: string, guestName?: string) => Promise<{ success: boolean; error?: string; data?: T }>
  onDeleteItem: (id: string) => Promise<{ error?: string }>
  onLoadMore: (page: number) => Promise<{ data?: T[]; error?: string }>
  onCountChange?: (count: number) => void
  loadedAllText?: string
}

export function useThreadedList<T extends ThreadedItem>({
  initialItems,
  initialTotal,
  onSubmit,
  onDeleteItem,
  onLoadMore,
  onCountChange,
  loadedAllText = '已加载全部',
}: UseThreadedListOptions<T>) {
  const [items, setItems] = useState<T[]>(initialItems)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [replyTarget, setReplyTarget] = useState<string | null>(null)

  const hasMore = items.length < total

  async function handleSubmit(content: string, parentId?: string, guestName?: string) {
    const result = await onSubmit(content, parentId, guestName)
    if (!result.error && result.data) {
      setReplyTarget(null)
      const newItem = result.data
      if (parentId) {
        setItems((prev) => {
          const isTopLevel = prev.some((item) => item.id === parentId)
          const next = isTopLevel
            ? prev.map((item) =>
                item.id === parentId
                  ? { ...item, replies: [...(item.replies ?? []), newItem] }
                  : item
              )
            : prev.map((item) =>
                item.replies?.some((r) => r.id === parentId)
                  ? { ...item, replies: [...(item.replies ?? []), newItem] }
                  : item
              )
          return next
        })
        if (onCountChange) onCountChange(1)
      } else {
        setItems((prev) => {
          const next = [newItem, ...prev]
          setTotal((c) => c + 1)
          return next
        })
        if (onCountChange) onCountChange(1)
      }
      return { success: true }
    }
    return { success: false, error: result.error }
  }

  async function handleDelete(id: string) {
    const result = await onDeleteItem(id)
    if (!result.error) {
      setItems((prev) => {
        const isTopLevel = prev.some((item) => item.id === id)
        return isTopLevel
          ? prev.filter((item) => item.id !== id)
          : prev.map((item) => ({
              ...item,
              replies: item.replies?.filter((r) => r.id !== id),
            }))
      })
      setTotal((c) => c - 1)
      if (onCountChange) onCountChange(-1)
    }
  }

  async function handleLoadMore() {
    setLoading(true)
    const nextPage = page + 1
    const result = await onLoadMore(nextPage)
    const newItems = result.data
    if (newItems && newItems.length > 0) {
      setItems((prev) => {
        const existingIds = new Set(prev.map((item) => item.id))
        const trulyNew = newItems.filter((item) => !existingIds.has(item.id))
        return [...prev, ...trulyNew]
      })
      setPage(nextPage)
    }
    setLoading(false)
  }

  return {
    items,
    total,
    page,
    loading,
    replyTarget,
    hasMore,
    setReplyTarget,
    handleSubmit,
    handleDelete,
    handleLoadMore,
  }
}
