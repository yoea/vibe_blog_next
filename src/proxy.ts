import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  // ============================================
  // Step 1: 维护模式检查
  // ============================================

  // 允许访问的路径列表（维护模式下仍可访问）
  const maintenanceAllowlist = ['/about', '/privacy', '/legal', '/maintenance']
  const pathname = request.nextUrl.pathname
  const isAllowed = maintenanceAllowlist.some(p => pathname === p || pathname.startsWith(p + '/'))

  if (!isAllowed) {
    try {
      const supabase = await createMiddlewareClient(request)
      const { data } = await supabase
        .from('site_config')
        .select('maintenance_mode')
        .eq('id', 1)
        .maybeSingle()

      if (data?.maintenance_mode) {
        return NextResponse.rewrite(new URL('/maintenance', request.url))
      }
    } catch {
      // 查询失败时放行（假设维护模式关闭），避免冷启动误拦
    }
  }

  // ============================================
  // Step 2: PKCE 回调处理
  // ============================================
  if (request.nextUrl.searchParams.has('code') && !request.nextUrl.pathname.startsWith('/api/auth/callback')) {
    const callbackUrl = new URL('/api/auth/callback', request.url)
    callbackUrl.searchParams.set('code', request.nextUrl.searchParams.get('code')!)
    callbackUrl.searchParams.set('redirect_to', '/reset-password')
    return NextResponse.redirect(callbackUrl)
  }

  // ============================================
  // Step 3: Session 更新 + 路由保护
  // ============================================
  const { response, user } = await updateSession(request)

  const protectedPaths = ['/posts/new', '/posts-edit', '/profile', '/settings']
  const isProtected = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )
  if (isProtected && !user) {
    const url = new URL('/login', request.url)
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  const authPaths = ['/login', '/register']
  const isAuthPath = authPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )
  if (isAuthPath && user) {
    const redirectUrl = new URL('/profile', request.url)
    const redirectResponse = NextResponse.redirect(redirectUrl)
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}

// 内联的 middleware Supabase 客户端（轻量，仅查 site_config）
async function createMiddlewareClient(request: NextRequest) {
  const { createServerClient } = await import('@supabase/ssr')
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {}, // 只读查询，无需写 cookie
      },
    }
  )
}
