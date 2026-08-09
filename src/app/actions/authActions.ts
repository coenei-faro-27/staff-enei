'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseJSClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && !url.includes('your-project') && !key.includes('your-anon-key')
}

// Admin client using service_role key to resolve username/login_email aliases
function createAdminClient() {
  return createSupabaseJSClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

/**
 * Server Action for User Login
 * Executes completely on the server to prevent client-side network/adblocker/CORS issues.
 */
export async function loginAction(
  input: FormData | { email?: string; password?: string }
): Promise<{ success: boolean; error?: string }> {
  let email = ''
  let password = ''

  if (input instanceof FormData) {
    email = (input.get('email') as string) || ''
    password = (input.get('password') as string) || ''
  } else if (input && typeof input === 'object') {
    email = input.email || ''
    password = input.password || ''
  }

  email = email.trim()

  if (!email || !password) {
    return { 
      success: false, 
      error: 'Por favor, introduz o teu e-mail/username e a palavra-passe.' 
    }
  }

  // 1. Local Mode Simulation (when Supabase is not configured)
  if (!isSupabaseConfigured()) {
    if (password.length >= 6) {
      const cookieStore = await cookies()
      cookieStore.set('enei_local_auth', 'true', {
        path: '/',
        maxAge: 86400,
        sameSite: 'lax',
      })
      return { success: true }
    }
    return {
      success: false,
      error: 'Credenciais inválidas. A palavra-passe deve ter pelo menos 6 caracteres.'
    }
  }

  // 2. Supabase Server-Side Authentication
  try {
    let authEmail = email

    // Resolve login email prefix/alias (e.g. username or username@coenei.pt) to real registered email
    if (!authEmail.includes('@') || authEmail.endsWith('@coenei.pt')) {
      let normalized = authEmail
      if (!normalized.includes('@')) {
        normalized = `${normalized}@coenei.pt`
      }

      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const adminClient = createAdminClient()
          const { data } = await adminClient
            .from('profiles')
            .select('email')
            .eq('login_email', normalized)
            .single()

          if (data?.email) {
            authEmail = data.email
          }
        } catch (resolveErr) {
          console.warn('Could not resolve custom login_email alias, falling back to input:', resolveErr)
        }
      }
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password,
    })

    if (error) {
      console.error('Supabase signInWithPassword error:', error.status, error.message)

      // Supabase API down / 500 / 521 / network errors
      if (
        error.status === 521 ||
        error.status === 500 ||
        error.status === 502 ||
        error.status === 503 ||
        error.status === 504 ||
        error.name === 'AuthRetryableFetchError' ||
        error.message?.toLowerCase().includes('network') ||
        error.message?.toLowerCase().includes('fetch') ||
        error.message?.toLowerCase().includes('failed to fetch')
      ) {
        return {
          success: false,
          error: 'Serviço de autenticação temporariamente indisponível. Tenta novamente.'
        }
      }

      // Invalid credentials
      if (
        error.status === 400 ||
        error.code === 'invalid_credentials' ||
        error.message?.toLowerCase().includes('invalid login credentials')
      ) {
        return {
          success: false,
          error: 'Credenciais inválidas. Verifica o teu e-mail/username e a palavra-passe.'
        }
      }

      // Rate limit
      if (error.status === 429) {
        return {
          success: false,
          error: 'Demasiadas tentativas de login. Aguarda alguns minutos e tenta novamente.'
        }
      }

      return {
        success: false,
        error: error.message || 'Erro ao efetuar login. Verifica as tuas credenciais.'
      }
    }

    return { success: true }
  } catch (err: unknown) {
    console.error('loginAction exception:', err)
    return {
      success: false,
      error: 'Serviço de autenticação temporariamente indisponível. Tenta novamente.'
    }
  }
}

/**
 * Server Action for Password Reset Email
 */
export async function forgotPasswordAction(
  loginOrEmail: string
): Promise<{ success: boolean; error?: string }> {
  const emailInput = loginOrEmail.trim()
  if (!emailInput) {
    return { success: false, error: 'Por favor, introduz o teu e-mail ou username.' }
  }

  if (!isSupabaseConfigured()) {
    return { success: true }
  }

  try {
    let authEmail = emailInput
    if (!authEmail.includes('@') || authEmail.endsWith('@coenei.pt')) {
      let normalized = authEmail
      if (!normalized.includes('@')) {
        normalized = `${normalized}@coenei.pt`
      }
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const adminClient = createAdminClient()
          const { data } = await adminClient
            .from('profiles')
            .select('email')
            .eq('login_email', normalized)
            .single()
          if (data?.email) {
            authEmail = data.email
          }
        } catch (e) {
          console.warn('Could not resolve email for reset:', e)
        }
      }
    }

    const supabase = await createClient()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
      redirectTo: `${siteUrl}/auth/callback?next=/set-password`
    })

    if (error) {
      if (
        error.status === 521 ||
        error.status === 500 ||
        error.status === 502 ||
        error.status === 503 ||
        error.status === 504 ||
        error.name === 'AuthRetryableFetchError'
      ) {
        return {
          success: false,
          error: 'Serviço de autenticação temporariamente indisponível. Tenta novamente.'
        }
      }
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: unknown) {
    console.error('forgotPasswordAction exception:', err)
    return {
      success: false,
      error: 'Serviço de autenticação temporariamente indisponível. Tenta novamente.'
    }
  }
}

/**
 * Server Action for User Logout
 */
export async function logoutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } else {
    const cookieStore = await cookies()
    cookieStore.delete('enei_local_auth')
  }
  redirect('/login')
}
