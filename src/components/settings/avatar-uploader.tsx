'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Cropper from 'react-easy-crop'
import type { Point, Area } from 'react-easy-crop'
import browserImageCompression from 'browser-image-compression'
import { uploadAvatar, deleteAvatar } from '@/lib/actions/avatar-actions'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Camera, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface AvatarUploaderProps {
  userId: string
  displayName: string
  currentAvatarUrl: string | null
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

async function getCroppedImg(imageSrc: string, crop: Area): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  canvas.width = crop.width
  canvas.height = crop.height

  ctx.drawImage(
    image,
    crop.x, crop.y, crop.width, crop.height,
    0, 0, crop.width, crop.height
  )

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9)
  })
}

export function AvatarUploader({ userId, displayName, currentAvatarUrl }: AvatarUploaderProps) {
  const [cropOpen, setCropOpen] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedPixels, setCroppedPixels] = useState<Area | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)
  const router = useRouter()

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 20 * 1024 * 1024) {
      toast.error('文件大小不能超过 20MB')
      return
    }
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件')
      return
    }

    // Revoke previous object URL to avoid memory leak
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)

    const url = URL.createObjectURL(file)
    objectUrlRef.current = url
    setImageSrc(url)
    setZoom(1)
    setCrop({ x: 0, y: 0 })
    setCropOpen(true)

    // Reset file input so re-selecting the same file triggers onChange
    e.target.value = ''
  }

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedPixels(croppedAreaPixels)
  }, [])

  const handleUpload = async () => {
    if (!imageSrc || !croppedPixels) return
    setUploading(true)

    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedPixels)
      const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' })

      const compressedFile = await browserImageCompression(file, {
        maxSizeMB: 0.1,
        maxWidthOrHeight: 512,
        useWebWorker: true,
      })

      const formData = new FormData()
      formData.append('avatar', compressedFile)

      const result = await uploadAvatar(formData)
      if (result.error) {
        toast.error(result.error)
      } else {
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
        setAvatarUrl(result.avatarUrl ?? null)
        toast.success('头像上传成功')
        setCropOpen(false)
        setImageSrc(null)
        router.refresh()
      }
    } catch {
      toast.error('处理图片失败，请重试')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    const result = await deleteAvatar()
    setDeleting(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      setAvatarUrl(null)
      setDeleteConfirmOpen(false)
      toast.success('头像已删除')
      router.refresh()
    }
  }

  return (
    <>
      <div className="flex flex-col items-center gap-3">
        <Avatar
          avatarUrl={avatarUrl}
          displayName={displayName}
          userId={userId}
          size="xl"
          previewable
        />
        <div className="space-y-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Camera className="h-3.5 w-3.5 mr-1.5" />
              {uploading ? '上传中...' : '更换头像'}
            </Button>
            {avatarUrl && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={uploading}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                删除
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            支持 JPG、PNG，最大 20MB
          </p>
        </div>
      </div>

      <Dialog open={cropOpen} onOpenChange={(open) => {
        if (!open) {
          if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
          objectUrlRef.current = null
          setImageSrc(null)
          setCroppedPixels(null)
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>调整头像裁剪区域</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative w-full aspect-square bg-muted rounded-lg overflow-hidden">
              {imageSrc && (
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-8 text-right">{zoom.toFixed(1)}x</span>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
                objectUrlRef.current = null
                setCropOpen(false)
                setImageSrc(null)
              }}>
                取消
              </Button>
              <Button onClick={handleUpload} disabled={uploading || !croppedPixels}>
                {uploading ? '上传中...' : '确认上传'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除头像</DialogTitle>
            <DialogDescription>确定要删除头像吗？此操作不可撤销。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>取消</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? '删除中...' : '确认删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
