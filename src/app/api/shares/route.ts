import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

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

export async function GET(request: NextRequest) {
  const postId = request.nextUrl.searchParams.get('postId')
  if (!postId) {
    return NextResponse.json({ error: 'missing postId' }, { status: 400 })
  }

  const supabase = getSupabase(request)
  const { count } = await supabase
    .from('post_shares')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId)

  return NextResponse.json({ count: count ?? 0 })
}

export async function POST(request: NextRequest) {
  try {
    const { postId } = await request.json()
    if (!postId) {
      return NextResponse.json({ error: 'missing postId' }, { status: 400 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
    const supabase = getSupabase(request)
    await supabase.from('post_shares').insert({ post_id: postId, ip })
  } catch {
    // Silently ignore
  }

  return NextResponse.json({ ok: true })
}
