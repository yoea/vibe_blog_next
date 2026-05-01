import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

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

  // linkIdentity 关联前记录的原始用户 ID
  const linkingUserId = request.cookies.get('linking_user_id')?.value

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('[auth-callback] exchangeCodeForSession failed:', error.message)
    }
    // 无论 exchange 是否成功，都设置 login_success cookie
    // （exchange 可能因 PKCE 验证器已被消费而报错，但 session 仍可能有效）
    if (!error) {
      // 检测 linkIdentity 导致的用户切换（GitHub 已绑定其他账号）
      if (linkingUserId) {
        const { data: { user: newUser } } = await supabase.auth.getUser()
        if (newUser && newUser.id !== linkingUserId) {
          // GitHub 已绑定其他账号，登出被切换的会话，恢复原始用户状态
          await supabase.auth.signOut()
          cookiesToSet.push({ name: 'linking_user_id', value: '', options: { maxAge: 0, path: '/' } })
          cookiesToSet.push({ name: 'link_error', value: 'github_already_linked', options: { maxAge: 10, path: '/' } })
        } else {
          // 关联成功，清除关联 cookie
          cookiesToSet.push({ name: 'linking_user_id', value: '', options: { maxAge: 0, path: '/' } })
          cookiesToSet.push({ name: 'login_success', value: '1', options: { maxAge: 10, path: '/' } })
        }
      } else {
        // 普通登录
        cookiesToSet.push({ name: 'login_success', value: '1', options: { maxAge: 10, path: '/' } })
      }
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `http://localhost:${process.env.PORT || 3000}`

  // When forwarded from the proxy (code detected without callback path),
  // use the explicit redirect_to parameter instead of guessing the type.
  const explicitRedirect = searchParams.get('redirect_to')

  let redirectTo: string
  if (explicitRedirect) {
    redirectTo = `${siteUrl}${explicitRedirect.startsWith('/') ? explicitRedirect : `/${explicitRedirect}`}`
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
