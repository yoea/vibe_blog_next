'use client'

import { useState } from 'react'
import { toggleMaintenanceMode } from '@/lib/actions/admin-actions'
import { Button } from '@/components/ui/button'

export function MaintenanceClient({ isAdmin }: { isAdmin: boolean }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleDisable = async () => {
    setLoading(true)
    const { error } = await toggleMaintenanceMode()
    setLoading(false)
    if (error) {
      alert(error)
    } else {
      setDone(true)
      location.reload()
    }
  }

  return (
    <div className="mt-6 space-y-3">
      <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium bg-accent text-primary">
        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" />
        维护模式已开启
      </div>

      {isAdmin && (
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisable}
            disabled={loading}
          >
            {loading ? '关闭中...' : done ? '已关闭' : '关闭维护模式'}
          </Button>
        </div>
      )}
    </div>
  )
}
