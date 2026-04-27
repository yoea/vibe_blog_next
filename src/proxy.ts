import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  // Handle Supabase PKCE redirect (e.g., password reset)
  // If the URL has a ?code= parameter, forward to the callback route
  // so the session is properly set before the page renders.
  if (request.nextUrl.searchParams.has('code') && !request.nextUrl.pathname.startsWith('/api/auth/callback')) {
    const callbackUrl = new URL('/api/auth/callback', request.url)
    callbackUrl.searchParams.set('code', request.nextUrl.searchParams.get('code')!)
    callbackUrl.searchParams.set('redirect_to', '/reset-password')
    return NextResponse.redirect(callbackUrl)
  }

  const { response, user } = await updateSession(request)

  // Protected routes require authentication
  const protectedPaths = ['/posts/new', '/posts-edit', '/profile', '/settings']
  const isProtected = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )
  if (isProtected && !user) {
    const url = new URL('/login', request.url)
    url.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Auth pages redirect to home if already logged in
  const authPaths = ['/login', '/register']
  const isAuthPath = authPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )
  if (isAuthPath && user) {
    const redirectUrl = new URL('/profile', request.url)
    const redirectResponse = NextResponse.redirect(redirectUrl)
    // Forward cookies from updateSession response to ensure session persists
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
