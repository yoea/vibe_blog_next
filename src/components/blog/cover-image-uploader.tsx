'use client';

import { useState, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import type { Point, Area } from 'react-easy-crop';
import browserImageCompression from 'browser-image-compression';
import {
  uploadCoverImage,
  removeCoverImage,
} from '@/lib/actions/cover-actions';
import { fetchImageFromUrl, listUserImages } from '@/lib/actions/image-actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ImagePlus, Trash2, Link, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

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
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<
    { url: string; name: string }[]
  >([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const galleryFetchedRef = useRef(false);

  useEffect(() => {
    if (galleryFetchedRef.current || !postId) return;
    galleryFetchedRef.current = true;
    listUserImages().then((result) => {
      if (!result.error) setGalleryImages(result.images ?? []);
    });
  }, [postId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('封面图不能超过 20MB');
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

  const handleUrlSubmit = async () => {
    const url = urlInput.trim();
    if (!url) return;

    // Supabase Storage URL — 直接使用，不重新上传
    if (url.includes('.supabase.co/storage/v1/object/public/')) {
      setUrlDialogOpen(false);
      setUrlInput('');
      onCoverChange(url);
      toast.success('封面图已设置');
      return;
    }

    // 外部 URL — 服务端获取后进入裁剪流程
    setUrlLoading(true);
    const result = await fetchImageFromUrl(url);
    setUrlLoading(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (result.dataUrl) {
      setUrlDialogOpen(false);
      setUrlInput('');
      setImageSrc(result.dataUrl);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedPixels(null);
      setCropOpen(true);
    }
  };

  const handleOpenGallery = async () => {
    if (galleryImages.length > 0) {
      setGalleryOpen(true);
      return;
    }
    setGalleryOpen(true);
    setGalleryLoading(true);
    const result = await listUserImages();
    setGalleryLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      setGalleryImages(result.images ?? []);
    }
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
        <div className="flex items-center justify-center gap-3">
          <div
            className="relative rounded-md overflow-hidden w-48 aspect-video bg-muted shrink-0 cursor-pointer"
            onClick={() => setPreviewOpen(true)}
            role="button"
            tabIndex={0}
            aria-label="查看封面大图"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setPreviewOpen(true);
            }}
          >
            <img
              src={currentCoverUrl}
              alt="文章封面"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col gap-1.5 shrink-0 min-w-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="whitespace-nowrap"
            >
              <ImagePlus className="h-3.5 w-3.5 shrink-0" />
              <span className="ml-1">从相册选</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUrlDialogOpen(true)}
              disabled={uploading}
              className="whitespace-nowrap"
            >
              <Link className="h-3.5 w-3.5 shrink-0" />
              <span className="ml-1">粘贴URL</span>
            </Button>
              <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenGallery}
              disabled={uploading}
              className="whitespace-nowrap"
            >
              <ImageIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="ml-1">选择已有</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive whitespace-nowrap"
              onClick={handleRemove}
              disabled={removing}
            >
              <Trash2 className="h-3.5 w-3.5 shrink-0" />
              <span className="ml-1">移除封面</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !postId}
            className="w-48 aspect-video rounded-md border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary/50 hover:text-primary/70 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            title={!postId ? '请先保存文章草稿再添加封面' : '添加封面图'}
          >
            <ImagePlus className="h-5 w-5" />
            <span className="text-[11px]">
              {!postId ? '保存后可添加封面' : '添加封面 (16:9)'}
            </span>
          </button>
          <div className="flex flex-col gap-1.5 shrink-0 min-w-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setUrlDialogOpen(true)}
              disabled={!postId}
              className="whitespace-nowrap"
            >
              <Link className="h-3.5 w-3.5 shrink-0" />
              <span className="ml-1">粘贴URL</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenGallery}
              disabled={!postId}
              className="whitespace-nowrap"
            >
              <ImageIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="ml-1">选择已有</span>
            </Button>
          </div>
        </div>
      )}

      {uploading && (
        <p className="text-xs text-muted-foreground text-center">上传中...</p>
      )}

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-3xl p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentCoverUrl!}
            alt="文章封面"
            className="object-contain rounded-lg max-h-[80vh] w-full h-auto"
          />
        </DialogContent>
      </Dialog>

      {/* Gallery dialog */}
      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>从已上传图片选择</DialogTitle>
          </DialogHeader>
          {galleryLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              加载中...
            </p>
          ) : galleryImages.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              暂无已上传的图片
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto py-2">
              {galleryImages.map((img) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => {
                    setGalleryOpen(false);
                    onCoverChange(img.url);
                    toast.success('封面图已设置');
                  }}
                  className="aspect-video rounded-md overflow-hidden border hover:border-primary transition-colors cursor-pointer"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.name}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* URL input dialog */}
      <Dialog open={urlDialogOpen} onOpenChange={setUrlDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>通过 URL 添加封面</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/image.jpg"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleUrlSubmit();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUrlDialogOpen(false)}
              disabled={urlLoading}
            >
              取消
            </Button>
            <Button
              onClick={handleUrlSubmit}
              disabled={urlLoading || !urlInput.trim()}
            >
              {urlLoading ? '获取中...' : '确认'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
