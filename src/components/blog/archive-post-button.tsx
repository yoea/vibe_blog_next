'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { archivePost } from '@/lib/actions/archive-actions'

interface Props {
  postId: string
  postTitle: string
}

export function ArchivePostButton({ postId, postTitle }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleArchive = () => {
    startTransition(async () => {
      const result = await archivePost(postId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('文章已归档')
        setOpen(false)
        router.push('/')
      }
    })
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 cursor-pointer text-orange-600 hover:text-orange-700 hover:border-orange-300"
        onClick={() => setOpen(true)}
      >
        <Archive className="h-4 w-4" />
        <span>归档</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>归档文章</DialogTitle>
            <DialogDescription>
              确定要将「{postTitle}」归档吗？归档后文章将从公开列表中移除，可在后台管理中恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleArchive} disabled={isPending}>
              {isPending ? '归档中...' : '确认归档'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
