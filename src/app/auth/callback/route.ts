import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { type EmailOtpType } from '@supabase/supabase-js'

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && !url.includes('your-project') && !key.includes('your-anon-key')
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/set-password'

  // Create target redirect URL
  const redirectTo = `${origin}${next}`
  const response = NextResponse.redirect(redirectTo)

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(`${origin}/login?error=auth_not_configured`)
  }

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

  // 1. PKCE Code Exchange Flow (?code=...)
  if (code) {
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        return response
      }
      console.error('Callback error exchanging PKCE code for session:', error)
    } catch (err) {
      console.error('Callback exception during PKCE code exchange:', err)
    }
  }

  // 2. Token Hash Flow (?token_hash=...&type=invite|recovery)
  if (tokenHash && type) {
    try {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      })
      if (!error) {
        return response
      }
      console.error('Callback error verifying token_hash OTP:', error)
    } catch (err) {
      console.error('Callback exception during token_hash verification:', err)
    }
  }

  // Redirect to login if both exchanges failed or weren't present
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
