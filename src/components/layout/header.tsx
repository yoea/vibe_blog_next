'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogIn, FileText, Settings, Menu, X, Sun, Moon, SunMoon, Home, User, Search } from 'lucide-react'
import { useTheme, type ThemeMode } from '@/components/layout/theme-provider'

export function Header({ siteTitle, isMaintenance }: { siteTitle: string; isMaintenance?: boolean }) {
  const [user, setUser] = useState<{ email: string | null } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMac, setIsMac] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const menuOpenRef = useRef(menuOpen)
  menuOpenRef.current = menuOpen
  const { mode, resolved, setMode } = useTheme()
  const pathname = usePathname()

  // 点击/滑动非菜单区域折叠
  useEffect(() => {
    const handleEvent = (e: MouseEvent | TouchEvent) => {
      if (menuOpenRef.current && headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    const handleScroll = () => {
      if (menuOpenRef.current) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleEvent)
    document.addEventListener('touchstart', handleEvent, { passive: true })
    window.addEventListener('scroll', handleScroll, { once: true })
    return () => {
      document.removeEventListener('mousedown', handleEvent)
      document.removeEventListener('touchstart', handleEvent)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const cycleMode = () => {
    const order: ThemeMode[] = ['light', 'dark', 'system']
    const idx = order.indexOf(mode)
    setMode(order[(idx + 1) % order.length])
  }

  const ThemeIcon = mode === 'system' ? SunMoon : mode === 'dark' ? Moon : Sun
  const themeLabel = mode === 'system' ? '跟随系统' : mode === 'dark' ? '深色模式' : '浅色模式'

  useEffect(() => {
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0)
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser({ email: session.user.email ?? null })
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setUser({ email: session.user.email ?? null })
      else setUser(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const loginHref = pathname === '/login' ? '/login' : `/login?redirect=${encodeURIComponent(pathname)}`

  const navLinks = isMaintenance ? null : (
    <>
      <Link href="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-md transition-colors">
        <Home className="h-4 w-4" />
        <span>首页</span>
      </Link>
      {user ? (
        <>
          <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-md transition-colors">
            <User className="h-4 w-4" />
            <span>个人中心</span>
          </Link>
          <Link href="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-md transition-colors">
            <Settings className="h-4 w-4" />
            <span>设置</span>
          </Link>
        </>
      ) : (
        <Link href={loginHref} onClick={() => setMenuOpen(false)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-md transition-colors">
          <LogIn className="h-4 w-4" />
          <span>登录</span>
        </Link>
      )}
    </>
  )

  return (
    <header ref={headerRef} className="border-b bg-background relative">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src="/logo.svg" alt={siteTitle} className="h-6 w-6" />
          <span className="font-bold text-lg">{siteTitle}</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-2">
          {navLinks}
          {!isMaintenance && (
            <button
              onClick={() => document.dispatchEvent(new CustomEvent('open-command-palette'))}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-md transition-colors"
              title={`搜索 (${isMac ? '⌘K' : 'Ctrl+K'})`}
            >
              <Search className="h-4 w-4" />
              <span>搜索</span>
            </button>
          )}
          <button onClick={cycleMode} className="p-2 text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-md transition-colors" title={themeLabel} aria-label={themeLabel}>
            <ThemeIcon className="h-4 w-4" />
          </button>
        </nav>

        {/* Mobile buttons */}
        <div className="flex items-center gap-1 sm:hidden">
          {!isMaintenance && (
            <button onClick={() => document.dispatchEvent(new CustomEvent('open-command-palette'))} className="p-2 text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-md transition-colors" title="搜索">
              <Search className="h-4 w-4" />
            </button>
          )}
          <button onClick={cycleMode} className="p-2 text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-md transition-colors" title={themeLabel} aria-label={themeLabel}>
            <ThemeIcon className="h-4 w-4" />
          </button>
          {!isMaintenance && (
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 text-muted-foreground hover:text-foreground transition-colors" aria-label={menuOpen ? '关闭菜单' : '打开菜单'}>
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && !isMaintenance && (
        <div className="sm:hidden absolute top-14 left-0 right-0 bg-background border-b shadow-lg z-50 px-4 py-3 space-y-2">
          {navLinks}
          <button
            onClick={() => { document.dispatchEvent(new CustomEvent('open-command-palette')); setMenuOpen(false) }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-md transition-colors w-full"
          >
            <Search className="h-4 w-4" />
            <span>搜索</span>
          </button>
        </div>
      )}
    </header>
  )
}
