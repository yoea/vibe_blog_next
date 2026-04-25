import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const nextUrl = searchParams.get('next')

  // Collect cookies set by Supabase into an array,
  // then apply them to the final redirect response.
  const cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(list) {
          cookiesToSet.push(...list)
        },
      },
    }
  )

  // Handle email verification (code-based flow)
  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Handle password recovery (token_hash-based flow)
  const tokenHash = searchParams.get('token_hash')
  if (tokenHash) {
    await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
  }

  // Determine redirect target
  const { data } = await supabase.auth.getUser()
  let redirectTo: URL

  if (data.user && type === 'recovery') {
    // 0.0.0.0 is not a valid hostname for browser cookies.
    // Redirect to localhost so the session cookie can be stored.
    const host = request.headers.get('host') ?? ''
    const baseUrl = host.startsWith('0.0.0.0')
      ? `http://localhost:${host.split(':')[1] ?? '3000'}`
      : request.url.replace(/^(https?:\/\/).+?($|\/)/, `$1${host}$2`)

    redirectTo = new URL('/reset-password', baseUrl)
  } else if (nextUrl) {
    redirectTo = new URL(nextUrl, request.url)
  } else {
    redirectTo = new URL('/', request.url)
  }

  // Create redirect response and apply all collected cookies
  const redirectResponse = NextResponse.redirect(redirectTo)
  for (const { name, value, options } of cookiesToSet) {
    redirectResponse.cookies.set(name, value, options)
  }

  return redirectResponse
}
