import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const nextUrl = searchParams.get('next')

  let response = NextResponse.next({ request: { headers: request.headers } })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Handle email verification (code-based flow)
  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Handle password recovery (token_hash-based flow)
  // The session is already established by getUser() in middleware
  // or by exchangeCodeForSession above
  const { data } = await supabase.auth.getUser()
  if (data.user && type === 'recovery') {
    return NextResponse.redirect(`${origin}/reset-password`)
  }

  // Redirect to provided next URL or default to home
  if (nextUrl) {
    return NextResponse.redirect(`${origin}${nextUrl}`)
  }

  return NextResponse.redirect(`${origin}/`)
}
