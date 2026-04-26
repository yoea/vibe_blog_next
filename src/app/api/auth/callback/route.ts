import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  const cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(list) { cookiesToSet.push(...list) },
      },
    }
  )

  if (tokenHash && type === 'recovery') {
    await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
  } else if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  let redirectTo: string
  if (type === 'recovery') {
    redirectTo = `${siteUrl}/reset-password`
  } else {
    const next = searchParams.get('next')
    redirectTo = next ? `${siteUrl}${next.startsWith('/') ? next : `/${next}`}` : siteUrl
  }

  const redirectResponse = NextResponse.redirect(redirectTo)
  for (const { name, value, options } of cookiesToSet) {
    redirectResponse.cookies.set(name, value, options)
  }

  return redirectResponse
}
