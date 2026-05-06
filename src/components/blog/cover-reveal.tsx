'use client';

import { useRef, useEffect } from 'react';

export function CoverReveal({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const onScroll = () => {
      const rect = img.getBoundingClientRect();
      const containerHeight = rect.height;
      const viewportHeight = window.innerHeight;
      // 容器进入视口底部时开始，离开视口顶部时结束
      const scrollStart = rect.bottom - viewportHeight;
      const scrollEnd = rect.top;
      const range = scrollEnd - scrollStart;
      if (range <= 0) {
        img.style.objectPosition = '50% 0%';
        return;
      }
      // progress: 0 = 顶部显示, 1 = 底部显示
      let progress = -scrollStart / range;
      progress = Math.max(0, Math.min(1, progress));
      img.style.objectPosition = `50% ${progress * 100}%`;
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className="w-full h-full object-cover"
      style={{ objectPosition: '50% 0%' }}
    />
  );
}
