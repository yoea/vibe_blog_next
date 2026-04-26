'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LogIn, FileText, Settings, Users, Menu, X } from 'lucide-react'

export function Header({ siteTitle }: { siteTitle: string }) {
  const [user, setUser] = useState<{ email: string | null } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
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

  const navLinks = (
    <>
      <Link href="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-md transition-colors">
        <FileText className="h-4 w-4" />
        <span>首页</span>
      </Link>
      <Link href="/author" onClick={() => setMenuOpen(false)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-md transition-colors">
        <Users className="h-4 w-4" />
        <span>作者</span>
      </Link>
      {user ? (
        <>
          <Link href="/my-posts" onClick={() => setMenuOpen(false)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-md transition-colors">
            <FileText className="h-4 w-4" />
            <span>我的</span>
          </Link>
          <Link href="/settings" onClick={() => setMenuOpen(false)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-md transition-colors">
            <Settings className="h-4 w-4" />
            <span>设置</span>
          </Link>
        </>
      ) : (
        <Link href="/login" onClick={() => setMenuOpen(false)} className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-md transition-colors">
          <LogIn className="h-4 w-4" />
          <span>登录</span>
        </Link>
      )}
    </>
  )

  return (
    <header className="border-b bg-white relative">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src="/logo.svg" alt="" className="h-6 w-6" />
          <span className="font-bold text-lg">{siteTitle}</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-2">
          {navLinks}
        </nav>

        {/* Mobile hamburger */}
        <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden p-2 text-muted-foreground hover:text-foreground transition-colors">
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="sm:hidden absolute top-14 left-0 right-0 bg-white border-b shadow-lg z-50 px-4 py-3 space-y-2">
          {navLinks}
        </div>
      )}
    </header>
  )
}
