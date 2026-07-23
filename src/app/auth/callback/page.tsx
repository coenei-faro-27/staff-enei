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
    let isMounted = true

    const handleAuthRedirect = (targetPath: string) => {
      if (isMounted) {
        router.push(targetPath)
      }
    }

    // 1. Listen for Supabase auth state changes (captures #access_token from hash automatically)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth Callback] Auth state event:', event, 'Session active:', !!session)
      
      if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY' || event === 'USER_UPDATED' || session) {
        handleAuthRedirect(next)
      }
    })

    // 2. Immediate check in case session was already initialized or stored
    const checkExistingSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) {
          console.error('[Auth Callback] GetSession error:', error)
        }
        if (session) {
          handleAuthRedirect(next)
          return
        }
      } catch (err) {
        console.error('[Auth Callback] Check session exception:', err)
      }
    }

    checkExistingSession()

    // 3. Fallback timeout: If after 6 seconds no session is captured, redirect to login with error
    const timeoutId = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session && isMounted) {
        console.warn('[Auth Callback] Session verification timed out.')
        setErrorMsg('Não foi possível verificar a tua sessão. Por favor tenta novamente.')
        setTimeout(() => {
          if (isMounted) {
            router.push('/login?error=auth_callback_failed')
          }
        }, 1500)
      }
    }, 6000)

    return () => {
      isMounted = false
      subscription.unsubscribe()
      clearTimeout(timeoutId)
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
