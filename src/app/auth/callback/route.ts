import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && !url.includes('your-project') && !key.includes('your-anon-key')
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/set-password'

  if (code && isSupabaseConfigured()) {
    try {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`)
      }
      console.error('Callback error exchanging code for session:', error)
    } catch (err) {
      console.error('Callback exception during token exchange:', err)
    }
  }

  // Redirect to login if code exchange failed or wasn't run
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
