'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LogIn,
  FileText,
  Settings,
  Menu,
  X,
  Sun,
  Moon,
  SunMoon,
  Home,
  User,
  Users,
  Tags,
  Search,
} from 'lucide-react';
import { useTheme, type ThemeMode } from '@/components/layout/theme-provider';

export function Header({
  siteTitle,
  isMaintenance,
}: {
  siteTitle: string;
  isMaintenance?: boolean;
}) {
  const [user, setUser] = useState<{
    email: string | null;
    displayName: string | null;
  } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const [sticky, setSticky] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuOpenRef = useRef(menuOpen);
  menuOpenRef.current = menuOpen;
  const { mode, resolved, setMode } = useTheme();
  const pathname = usePathname();

  // 点击/滑动非菜单区域折叠
  useEffect(() => {
    const handleEvent = (e: MouseEvent | TouchEvent) => {
      if (
        menuOpenRef.current &&
        headerRef.current &&
        !headerRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    const handleScroll = () => {
      if (menuOpenRef.current) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleEvent);
    document.addEventListener('touchstart', handleEvent, { passive: true });
    window.addEventListener('scroll', handleScroll, { once: true });
    return () => {
      document.removeEventListener('mousedown', handleEvent);
      document.removeEventListener('touchstart', handleEvent);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const cycleMode = () => {
    const order: ThemeMode[] = ['light', 'dark', 'system'];
    const idx = order.indexOf(mode);
    setMode(order[(idx + 1) % order.length]);
  };

  const ThemeIcon = mode === 'system' ? SunMoon : mode === 'dark' ? Moon : Sun;
  const themeLabel =
    mode === 'system' ? '跟随系统' : mode === 'dark' ? '深色模式' : '浅色模式';

  // 读取 sticky 偏好
  useEffect(() => {
    setSticky(localStorage.getItem('header_sticky') === 'true');
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'header_sticky') setSticky(e.newValue === 'true');
    };
    const onCustom = () =>
      setSticky(localStorage.getItem('header_sticky') === 'true');
    window.addEventListener('storage', onStorage);
    window.addEventListener('header-sticky-changed', onCustom);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('header-sticky-changed', onCustom);
    };
  }, []);

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
    const supabase = createClient();

    // 从 session 提取初始 displayName，再异步获取数据库中真实值
    const deriveUserState = (
      sessionUser: { email?: string; id: string } | undefined,
    ) => {
      if (!sessionUser) return null;
      return {
        email: sessionUser.email ?? null,
        displayName: sessionUser.email?.split('@')[0] ?? null,
      };
    };

    const fetchDisplayName = async (userId: string) => {
      try {
        const { data: settings } = await supabase
          .from('user_settings')
          .select('display_name')
          .eq('user_id', userId)
          .maybeSingle();
        return settings?.display_name ?? null;
      } catch {
        return null;
      }
    };

    const applySession = async (
      sessionUser: { email?: string; id: string } | undefined,
    ) => {
      if (!sessionUser) {
        setUser(null);
        return;
      }
      // 立即用 email 前缀兜底，tooltip 始终有用户名可显示
      setUser(deriveUserState(sessionUser));
      const displayName = await fetchDisplayName(sessionUser.id);
      if (displayName) {
        setUser({ email: sessionUser.email ?? null, displayName });
      }
    };

    const syncSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return applySession(session?.user);
    };

    syncSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') return;
      if (session?.user) {
        await applySession(session.user);
      } else {
        setUser(null);
      }
    });

    // 页面重新可见时校验 session（处理 tab 切换后 token 过期的场景）
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncSession();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const loginHref =
    pathname === '/login'
      ? '/login'
      : `/login?redirect=${encodeURIComponent(pathname)}`;

  const navLinks = isMaintenance ? null : (
    <>
      <Link
        href="/"
        onClick={() => setMenuOpen(false)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-md transition-colors"
      >
        <Home className="h-4 w-4" />
        <span>首页</span>
      </Link>
      <Link
        href="/author"
        onClick={() => setMenuOpen(false)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-md transition-colors"
      >
        <Users className="h-4 w-4" />
        <span>作者</span>
      </Link>
      <Link
        href="/tags"
        onClick={() => setMenuOpen(false)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-md transition-colors"
      >
        <Tags className="h-4 w-4" />
        <span>标签</span>
      </Link>
      {user ? (
        <>
          <Link
            href="/profile"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-md transition-colors"
          >
            <User className="h-4 w-4" />
            <span>我的</span>
          </Link>
          <Link
            href="/settings"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-md transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>设置</span>
          </Link>
        </>
      ) : (
        <Link
          href={loginHref}
          onClick={() => setMenuOpen(false)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-md transition-colors"
        >
          <LogIn className="h-4 w-4" />
          <span>登录</span>
        </Link>
      )}
    </>
  );

  return (
    <header
      ref={headerRef}
      className={`border-b bg-background relative${sticky ? ' sticky top-0 z-50' : ''}`}
    >
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            data-testid="site-logo"
          >
            <img src="/logo.svg" alt={siteTitle} className="h-6 w-6" />
            <span className="font-bold text-lg">{siteTitle}</span>
          </Link>
          {user && (
            <Link
              href="/profile"
              className="h-2 w-2 rounded-full bg-green-500 border border-background shrink-0 hover:ring-2 hover:ring-green-500/30 transition-all"
              title={`${user.displayName || (user.email ? user.email.split('@')[0] : '在线')} · 个人中心`}
            />
          )}
        </div>

        {/* Desktop nav */}
        <nav
          className="hidden md:flex items-center gap-2"
          aria-label="主导航"
          data-testid="desktop-nav"
        >
          {navLinks}
          {!isMaintenance && (
            <button
              onClick={() =>
                document.dispatchEvent(new CustomEvent('open-command-palette'))
              }
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-md transition-colors"
              title={`搜索 (${isMac ? '⌘K' : 'Ctrl+K'})`}
              data-testid="desktop-search-btn"
            >
              <Search className="h-4 w-4" />
              <span>搜索</span>
            </button>
          )}
          <button
            onClick={cycleMode}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-md transition-colors"
            title={themeLabel}
            aria-label={themeLabel}
            data-testid="theme-toggle"
          >
            <ThemeIcon className="h-4 w-4" />
          </button>
        </nav>

        {/* Mobile buttons */}
        <div className="flex items-center gap-1 md:hidden">
          {!isMaintenance && (
            <button
              onClick={() =>
                document.dispatchEvent(new CustomEvent('open-command-palette'))
              }
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-md transition-colors"
              aria-label="搜索"
              data-testid="mobile-search-btn"
            >
              <Search className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={cycleMode}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-md transition-colors"
            title={themeLabel}
            aria-label={themeLabel}
            data-testid="theme-toggle"
          >
            <ThemeIcon className="h-4 w-4" />
          </button>
          {!isMaintenance && (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={menuOpen ? '关闭菜单' : '打开菜单'}
              data-testid="mobile-menu-btn"
            >
              {menuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && !isMaintenance && (
        <div
          className="md:hidden absolute top-14 left-0 right-0 bg-background border-b shadow-lg z-50 px-4 py-3 space-y-2"
          role="navigation"
          aria-label="移动端导航"
          data-testid="mobile-nav"
        >
          {navLinks}
          <button
            onClick={() => {
              document.dispatchEvent(new CustomEvent('open-command-palette'));
              setMenuOpen(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-md transition-colors w-full"
          >
            <Search className="h-4 w-4" />
            <span>搜索</span>
          </button>
        </div>
      )}
    </header>
  );
}
