'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Loader2 } from 'lucide-react'

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const next = searchParams.get('next') || '/set-password'
    const code = searchParams.get('code')
    let isMounted = true

    const processAuth = async () => {
      try {
        // 1. Check window.location.hash for access_token & refresh_token
        const hash = typeof window !== 'undefined' ? window.location.hash : ''
        if (hash && hash.includes('access_token')) {
          const hashParams = new URLSearchParams(hash.substring(1))
          const accessToken = hashParams.get('access_token')
          const refreshToken = hashParams.get('refresh_token')

          if (accessToken && refreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            })

            if (!error && data.session) {
              console.log('[Auth Callback] Session established via setSession from URL hash')
              if (isMounted) router.push(next)
              return
            } else if (error) {
              console.error('[Auth Callback] setSession error:', error)
            }
          }
        }

        // 2. Check query param code (PKCE flow)
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code)
          if (!error && data.session) {
            console.log('[Auth Callback] Session established via exchangeCodeForSession')
            if (isMounted) router.push(next)
            return
          } else if (error) {
            console.error('[Auth Callback] exchangeCodeForSession error:', error)
          }
        }

        // 3. Check existing active session
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          console.log('[Auth Callback] Existing session found')
          if (isMounted) router.push(next)
          return
        }

        // 4. Fallback if no tokens or session found
        if (isMounted) {
          console.warn('[Auth Callback] No valid tokens or session found')
          setErrorMsg('Não foi possível verificar os dados de autenticação. A redirecionar...')
          setTimeout(() => {
            if (isMounted) router.push('/login?error=auth_callback_failed')
          }, 1500)
        }
      } catch (err) {
        console.error('[Auth Callback] Exception during processing:', err)
        if (isMounted) {
          setErrorMsg('Ocorreu um erro no processo de autenticação.')
          setTimeout(() => {
            if (isMounted) router.push('/login?error=auth_callback_failed')
          }, 1500)
        }
      }
    }

    processAuth()

    return () => {
      isMounted = false
    }
  }, [router, searchParams])

  return (
    <div className="border border-border-custom bg-secondary-bg p-8 rounded-xl shadow-2xl max-w-sm w-full text-center space-y-4 animate-fade-in">
      <div className="mx-auto h-12 w-12 rounded-full border border-brand-primary/30 bg-brand-primary/10 flex items-center justify-center text-brand-primary">
        <Loader2 size={24} className="animate-spin" />
      </div>

      <div className="space-y-1">
        <h2 className="text-base font-bold text-text-primary">
          A autenticar sessão...
        </h2>
        <p className="text-xs text-text-secondary leading-relaxed">
          {errorMsg || 'A validar o teu link de acesso. Serás redirecionado em breves momentos.'}
        </p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Suspense fallback={
        <div className="border border-border-custom bg-secondary-bg p-8 rounded-xl shadow-2xl max-w-sm w-full text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full border border-brand-primary/30 bg-brand-primary/10 flex items-center justify-center text-brand-primary">
            <Loader2 size={24} className="animate-spin" />
          </div>
          <h2 className="text-base font-bold text-text-primary">A carregar...</h2>
        </div>
      }>
        <AuthCallbackContent />
      </Suspense>
    </div>
  )
}
