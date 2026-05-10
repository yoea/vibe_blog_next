'use client';

import { useEffect, useState, useRef } from 'react';
import { List } from 'lucide-react';

interface DomHeading {
  id: string;
  text: string;
  level: number;
}

const STORAGE_KEY = 'toc_button_top';

export function TableOfContents({ enabled = true }: { enabled?: boolean }) {
  const [headings, setHeadings] = useState<DomHeading[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState(() => {
    if (typeof window === 'undefined') return 96;
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? Number(saved) : 96;
  });
  const panelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const dragState = useRef<{
    startY: number;
    startTop: number;
    moved: boolean;
  } | null>(null);

  // Extract headings from DOM (IDs come from rehype-slug, guaranteed match)
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>(
      '.markdown-body h2, .markdown-body h3, .markdown-body h4',
    );
    const found: DomHeading[] = [];
    elements.forEach((el) => {
      if (el.id) {
        found.push({
          id: el.id,
          text: el.textContent ?? '',
          level: Number(el.tagName[1]),
        });
      }
    });
    setHeadings(found);

    // Default open on wide screens (>=1340px)
    if (found.length > 0 && window.innerWidth >= 1340) {
      setOpen(true);
    }
  }, []);

  // Scroll-spy
  useEffect(() => {
    if (headings.length === 0) return;

    const headingElements = headings
      .map((h) => document.getElementById(h.id))
      .filter(Boolean) as HTMLElement[];

    if (headingElements.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length > 0) {
          const topmost = visibleEntries.reduce((a, b) =>
            a.boundingClientRect.top < b.boundingClientRect.top ? a : b,
          );
          setActiveId(topmost.target.id);
        }
      },
      {
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0,
      },
    );

    headingElements.forEach((el) => observerRef.current!.observe(el));

    return () => observerRef.current?.disconnect();
  }, [headings]);

  // Click outside to close (only on narrow screens < 1340px)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        window.innerWidth < 1340 &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Drag handling
  const onPointerDown = (e: React.PointerEvent) => {
    // Only primary button
    if (e.button !== 0) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startY: e.clientY, startTop: top, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.current) return;
    const dy = e.clientY - dragState.current.startY;
    if (Math.abs(dy) > 3) dragState.current.moved = true;
    const newTop = Math.max(
      0,
      Math.min(window.innerHeight - 32, dragState.current.startTop + dy),
    );
    setTop(newTop);
  };

  const onPointerUp = () => {
    if (!dragState.current) return;
    const wasDrag = dragState.current.moved;
    dragState.current = null;
    localStorage.setItem(STORAGE_KEY, String(top));
    // If not dragged, toggle panel
    if (!wasDrag) setOpen((v) => !v);
  };

  if (!enabled || headings.length === 0) return null;

  const indentClass: Record<number, string> = {
    2: 'pl-2',
    3: 'pl-4',
    4: 'pl-7',
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const topPos = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: topPos, behavior: 'smooth' });
    setActiveId(id);
    history.replaceState(null, '', `#${id}`);
  };

  return (
    <div ref={panelRef} className="fixed left-3 z-40" style={{ top }}>
      {/* Toggle button (draggable) */}
      <button
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex items-center justify-center w-8 h-8 rounded-md border bg-background/80 backdrop-blur-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shadow-sm cursor-grab active:cursor-grabbing touch-none select-none"
        aria-label={open ? '关闭目录' : '打开目录'}
        data-testid="toc-toggle"
      >
        <List className="w-4 h-4" />
      </button>

      {/* Panel */}
      {open && (
        <nav
          className="mt-1.5 w-52 rounded-lg border bg-background/95 backdrop-blur-sm shadow-lg p-3 overflow-y-auto max-h-[calc(100vh-7rem)]"
          aria-label="Table of contents"
          data-testid="toc-panel"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            目录
          </p>
          <ul className="space-y-0.5">
            {headings.map((heading) => (
              <li key={heading.id}>
                <a
                  href={`#${heading.id}`}
                  className={`block text-[13px] leading-relaxed py-0.5 border-l-2 transition-colors ${indentClass[heading.level] ?? 'pl-2'} ${
                    activeId === heading.id
                      ? 'border-primary text-primary font-medium'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollTo(heading.id);
                  }}
                >
                  {heading.text}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
