'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from 'cmdk'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Home, Users, FileText, User, Settings, LogIn, Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const STORAGE_KEY = 'command_frequency'

interface CommandDef {
  id: string
  label: string
  icon: LucideIcon
  group: '导航' | '操作'
  /** 未登录时隐藏 */
  requiresAuth?: boolean
  /** 仅未登录时显示 */
  requiresAnon?: boolean
  /** 执行动作 */
  action: () => void
}

const ITEM_CLASS =
  'flex items-center gap-3 px-5 py-2.5 text-sm cursor-pointer ' +
  'data-[selected=true]:bg-primary/10 dark:data-[selected=true]:bg-primary/20 ' +
  'data-[selected=true]:border-l-2 data-[selected=true]:border-primary data-[selected=true]:pl-[18px] ' +
  'data-[selected=true]:font-medium [&>svg]:data-[selected=true]:text-primary'

function loadFrequency(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveFrequency(freq: Record<string, number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(freq))
  } catch { /* quota exceeded */ }
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<{ email: string | null } | null>(null)
  const [frequency, setFrequency] = useState<Record<string, number>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isMac, setIsMac] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  // 加载使用频率
  useEffect(() => {
    setFrequency(loadFrequency())
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0)
  }, [])

  // 跟踪登录状态
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser({ email: session.user.email ?? null })
    })
  }, [])

  // 快捷键 (Cmd+K) + 自定义事件 (导航栏搜索按钮)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    const onOpen = () => setOpen(true)
    document.addEventListener('keydown', down)
    document.addEventListener('open-command-palette', onOpen)
    return () => {
      document.removeEventListener('keydown', down)
      document.removeEventListener('open-command-palette', onOpen)
    }
  }, [])

  // 重置搜索状态
  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setSearchResults([])
      setIsSearching(false)
    }
  }, [open])

  // Debounce 搜索
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`)
        const data = await res.json()
        setSearchResults(data.data ?? [])
      } catch {
        setSearchResults([])
      }
      setIsSearching(false)
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery])

  // 记录使用 + 执行动作
  const pick = useCallback((id: string, action: () => void) => {
    setOpen(false)
    const next = { ...frequency, [id]: (frequency[id] || 0) + 1 }
    setFrequency(next)
    saveFrequency(next)
    action()
  }, [frequency])

  // ─── 命令注册表 ─────────────────────────────
  // 新增命令只需在这里加一项
  const commands: CommandDef[] = useMemo(() => [
    { id: 'new-post',    label: '新建文章', icon: FileText, group: '导航', requiresAuth: true,  action: () => router.push('/posts/new') },
    { id: 'home',        label: '首页',     icon: Home,     group: '导航',                      action: () => router.push('/') },
    { id: 'profile',     label: '个人中心', icon: User,     group: '导航', requiresAuth: true,  action: () => router.push('/profile') },
    { id: 'settings',    label: '设置',     icon: Settings, group: '导航', requiresAuth: true,  action: () => router.push('/settings') },
    { id: 'authors',     label: '作者列表', icon: Users,    group: '导航',                      action: () => router.push('/author') },
    { id: 'login',       label: '登录',     icon: LogIn,    group: '导航', requiresAnon: true,  action: () => router.push('/login') },
  ], [router])

  // 过滤 + 排序
  const visible = useMemo(() => {
    const filtered = commands.filter((c) => {
      if (c.requiresAuth && !user) return false
      if (c.requiresAnon && user) return false
      if (searchQuery && !c.label.includes(searchQuery)) return false
      return true
    })

    return [...filtered].sort((a, b) => {
      const fa = frequency[a.id] || 0
      const fb = frequency[b.id] || 0
      if (fa !== fb) return fb - fa
      return commands.indexOf(a) - commands.indexOf(b)
    })
  }, [commands, user, frequency, searchQuery])

  const navItems = visible.filter((c) => c.group === '导航')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        showCloseButton={false}
        className="top-[18%] -translate-y-0 max-w-lg w-[90vw] p-0 gap-0 ring-1 ring-white/20 bg-white/80 dark:bg-gray-900/85 backdrop-blur-2xl shadow-2xl border-0 overflow-hidden"
      >
        <DialogTitle className="sr-only">命令面板</DialogTitle>
        <Command className="rounded-none border-0 shadow-none w-full overflow-hidden" shouldFilter={false}>
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
            <Search className="h-5 w-5 text-gray-400 shrink-0" />
            <CommandInput
              placeholder="搜索..."
              className="!border-0 !p-0 !ring-0 !shadow-none !outline-none text-base bg-transparent h-7"
              onValueChange={setSearchQuery}
            />
          </div>
          <CommandList className="max-h-72">
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              {searchQuery.trim() && !isSearching ? '未找到相关文章' : '无匹配结果'}
            </CommandEmpty>

            {/* 搜索文章结果 */}
            {searchQuery.trim() && (
              <CommandGroup
                heading={isSearching ? '搜索文章' : `搜索文章 · 共${searchResults.length}项`}
                className="[&_[cmdk-group-heading]]:px-5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-400 [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:uppercase"
              >
                {isSearching ? (
                  <div className="px-5 py-3 text-sm text-muted-foreground">搜索中...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((post: any) => (
                    <CommandItem
                      key={post.id}
                      onSelect={() => {
                        setOpen(false)
                        router.push(`/posts/${post.slug}`)
                      }}
                      className={`${ITEM_CLASS} overflow-hidden`}
                    >
                      <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{post.title}</div>
                        {post.excerpt && (
                          <div className="truncate text-[11px] text-muted-foreground leading-relaxed">{post.excerpt}</div>
                        )}
                      </div>
                    </CommandItem>
                  ))
                ) : (
                  <div className="px-5 py-3 text-sm text-muted-foreground">未找到相关文章</div>
                )}
              </CommandGroup>
            )}
            {navItems.length > 0 && (
              <CommandGroup
                heading="导航"
                className="[&_[cmdk-group-heading]]:px-5 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-400 [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:uppercase"
              >
                {navItems.map((c) => {
                  const Icon = c.icon
                  return (
                    <CommandItem key={c.id} onSelect={() => pick(c.id, c.action)} className={ITEM_CLASS}>
                      <Icon className="h-4 w-4 text-gray-400" />
                      <span>{c.label}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )}
          </CommandList>
          <div className="hidden sm:flex items-center justify-center gap-4 px-5 pt-4 pb-2 border-t border-gray-200/50 dark:border-gray-700/50">
            <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 font-mono text-[10px] text-gray-500 dark:text-gray-400">↑↓</kbd>
              <span>选择</span>
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 font-mono text-[10px] text-gray-500 dark:text-gray-400">↵</kbd>
              <span>确认</span>
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 font-mono text-[10px] text-gray-500 dark:text-gray-400">Esc</kbd>
              <span>关闭</span>
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <kbd className="inline-flex items-center justify-center h-5 px-1.5 rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 font-mono text-[10px] text-gray-500 dark:text-gray-400">{isMac ? '⌘K' : 'Ctrl+K'}</kbd>
              <span>打开</span>
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
