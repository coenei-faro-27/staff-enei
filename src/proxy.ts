import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && !url.includes('your-project') && !key.includes('your-anon-key')
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const isLoginPage = request.nextUrl.pathname.startsWith('/login')

  // --------------------------------------------------
  // SUPABASE AUTHENTICATION
  // --------------------------------------------------
  if (isSupabaseConfigured()) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Check user session
    const { data: { user } } = await supabase.auth.getUser()

    const isSetPasswordPage = request.nextUrl.pathname.startsWith('/set-password')
    const isAuthCallback = request.nextUrl.pathname.startsWith('/auth')

    if (!user && !isLoginPage && !isSetPasswordPage && !isAuthCallback) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (user && isLoginPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  } 
  // --------------------------------------------------
  // LOCAL SIMULATED AUTHENTICATION (LocalStorage fallback)
  // --------------------------------------------------
  else {
    const localAuthCookie = request.cookies.get('enei_local_auth')
    const isSetPasswordPage = request.nextUrl.pathname.startsWith('/set-password')
    const isAuthCallback = request.nextUrl.pathname.startsWith('/auth')

    if (!localAuthCookie && !isLoginPage && !isSetPasswordPage && !isAuthCallback) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (localAuthCookie && isLoginPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - icon.svg (app logo icon)
     */
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
