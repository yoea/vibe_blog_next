import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const MAX_LIKES_PER_IP_PER_HOUR = 10

function getSupabase(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {},
      },
    }
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const supabase = getSupabase(request)

    if (body.type === 'view') {
      await supabase.from('site_views').insert({ ip })
      return NextResponse.json({ ok: true })
    }

    if (body.type === 'like') {
      // Validate timestamp: must be within last 10 seconds
      const clientTs = Number(body.ts)
      if (!clientTs || Date.now() - clientTs > 10000 || Date.now() - clientTs < 0) {
        return NextResponse.json({ error: 'invalid timestamp' }, { status: 400 })
      }

      // Server-side rate limit check
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString()
      const { count } = await supabase
        .from('site_likes')
        .select('*', { count: 'exact', head: true })
        .eq('ip', ip)
        .gte('liked_at', oneHourAgo)

      if ((count ?? 0) >= MAX_LIKES_PER_IP_PER_HOUR) {
        return NextResponse.json({ error: 'rate limit exceeded' }, { status: 429 })
      }

      await supabase.from('site_likes').insert({ ip })
    }
  } catch {
    // Silently ignore
  }

  return NextResponse.json({ ok: true })
}
