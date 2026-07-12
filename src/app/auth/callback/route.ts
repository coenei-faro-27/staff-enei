import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && !url.includes('your-project') && !key.includes('your-anon-key')
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/set-password'

  // Create redirect response first so we can append cookies to it
  const response = NextResponse.redirect(`${origin}${next}`)

  if (code && isSupabaseConfigured()) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                response.cookies.set(name, value, options)
              })
            },
          },
        }
      )
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        return response
      }
      console.error('Callback error exchanging code for session:', error)
    } catch (err) {
      console.error('Callback exception during token exchange:', err)
    }
  }

  // Redirect to login if code exchange failed or wasn't run
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
