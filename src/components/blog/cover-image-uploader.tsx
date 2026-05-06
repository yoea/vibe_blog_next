'use client';

import { useState, useRef } from 'react';
import Cropper from 'react-easy-crop';
import type { Point, Area } from 'react-easy-crop';
import browserImageCompression from 'browser-image-compression';
import { uploadCoverImage, removeCoverImage } from '@/lib/actions/cover-actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ImagePlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  postId: string;
  currentCoverUrl: string | null;
  onCoverChange: (url: string | null) => void;
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function getCroppedImg(imageSrc: string, crop: Area): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = crop.width;
  canvas.height = crop.height;

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.9);
  });
}

export function CoverImageUploader({
  postId,
  currentCoverUrl,
  onCoverChange,
}: Props) {
  const [cropOpen, setCropOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedPixels, setCroppedPixels] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('封面图不能超过 2MB');
      return;
    }

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = URL.createObjectURL(file);
    setImageSrc(objectUrlRef.current);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedPixels(null);
    setCropOpen(true);
  };

  const handleCropConfirm = async () => {
    if (!imageSrc || !croppedPixels) return;
    setUploading(true);
    setCropOpen(false);

    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedPixels);
      const croppedFile = new File([croppedBlob], 'cover.jpg', {
        type: croppedBlob.type,
      });
      const compressed = await browserImageCompression(croppedFile, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });

      const formData = new FormData();
      formData.append('cover', compressed, 'cover.jpg');
      formData.append('postId', postId);

      const result = await uploadCoverImage(formData);
      if (result.error) {
        toast.error(result.error);
      } else if (result.coverUrl) {
        onCoverChange(result.coverUrl);
        toast.success('封面图已更新');
      }
    } catch {
      toast.error('处理图片失败');
    }

    setUploading(false);
    // Clean up
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setImageSrc(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemove = async () => {
    setRemoving(true);
    const result = await removeCoverImage(postId);
    if (result.error) {
      toast.error(result.error);
    } else {
      onCoverChange(null);
      toast.success('封面图已移除');
    }
    setRemoving(false);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {currentCoverUrl ? (
        <div className="relative rounded-md overflow-hidden w-40 aspect-video bg-muted shrink-0">
          <img
            src={currentCoverUrl}
            alt="文章封面"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center gap-2 opacity-0 hover:opacity-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <ImagePlus className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={removing}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !postId}
          className="w-40 aspect-video rounded-md border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:text-primary/70 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          title={!postId ? '请先保存文章草稿再添加封面' : '添加封面图'}
        >
          <ImagePlus className="h-5 w-5" />
          <span className="text-[11px]">
            {!postId ? '保存后可添加封面' : '添加封面 (16:9)'}
          </span>
        </button>
      )}

      {uploading && (
        <p className="text-xs text-muted-foreground text-center">上传中...</p>
      )}

      <Dialog open={cropOpen} onOpenChange={setCropOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>裁剪封面图 (16:9)</DialogTitle>
          </DialogHeader>
          <div className="relative w-full aspect-video bg-black rounded-md overflow-hidden">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={16 / 9}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, area) => setCroppedPixels(area)}
                showGrid
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCropOpen(false)}>
              取消
            </Button>
            <Button onClick={handleCropConfirm} disabled={!croppedPixels}>
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
