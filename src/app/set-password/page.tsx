'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'
import { Loader2, Lock, AlertCircle, Sparkles, CheckCircle } from 'lucide-react'

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && !url.includes('your-project') && !key.includes('your-anon-key')
}

export default function SetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [localMode] = useState(() => !isSupabaseConfigured())

  useEffect(() => {
    // Check active session
    if (!localMode) {
      const supabase = createClient()
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          // Warning if no active session
          console.warn('Nenhuma sessão ativa encontrada. O link pode ter expirado.')
        }
      })
    }
  }, [localMode])

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    if (password.length < 6) {
      setErrorMsg('A palavra-passe deve ter pelo menos 6 caracteres.')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setErrorMsg('As palavras-passe não coincidem.')
      setLoading(false)
      return
    }

    if (localMode) {
      // Local mode
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Update simulated user if any is pending
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('enei_simulated_users')
        if (stored) {
          try {
            const users = JSON.parse(stored)
            const pendingUser = users.find((u: { is_pending?: boolean }) => u.is_pending)
            if (pendingUser) {
              pendingUser.is_pending = false
              localStorage.setItem('enei_simulated_users', JSON.stringify(users))
            }
          } catch (e) {
            console.error('Error updating simulated pending user:', e)
          }
        }
      }

      setSuccess(true)
      setLoading(false)
      setTimeout(() => {
        window.location.href = '/login'
      }, 2000)
    } else {
      // Supabase password update
      try {
        const supabase = createClient()
        const { error } = await supabase.auth.updateUser({
          password: password
        })

        if (error) throw error

        setSuccess(true)
        setLoading(false)
        
        // Redirect to home
        setTimeout(() => {
          window.location.href = '/'
        }, 2000)
      } catch (err: unknown) {
        console.error('Error updating password:', err)
        const msg = err instanceof Error ? err.message : 'Erro ao atualizar palavra-passe. Tente novamente.'
        setErrorMsg(msg)
        setLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-4">
      {/* Decorative gradient blur in background */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-brand-primary/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-brand-primary/5 rounded-full blur-3xl -z-10" />

      <div className="w-full max-w-sm border border-border-custom bg-secondary-bg p-8 rounded-lg space-y-6 shadow-2xl relative overflow-hidden">
        {/* Top Glow bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-brand-primary" />

        {/* Logo and Header */}
        <div className="flex flex-col items-center text-center space-y-2.5">
          <div className="p-2.5 border border-border-custom rounded-lg bg-background">
            <Image 
              src="/icon.svg" 
              alt="Logo ENEI" 
              width={36} 
              height={36} 
              className="h-9 w-9 rounded invert dark:invert-0"
              priority
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-text-primary">Definir Palavra-passe</h1>
            <p className="text-xs text-text-secondary">Cria a tua palavra-passe para acederes à plataforma.</p>
          </div>
        </div>

        {/* Local Mode Badge */}
        {localMode && (
          <div className="flex items-center gap-1.5 border border-brand-primary/20 bg-brand-primary/5 px-3 py-2 rounded text-[11px] text-text-primary">
            <Sparkles size={12} className="text-brand-primary shrink-0" />
            <p className="leading-snug">
              <strong>Modo Local Activo:</strong> Simulação de definição de password concluída com sucesso.
            </p>
          </div>
        )}

        {/* Success State */}
        {success ? (
          <div className="space-y-4 text-center py-4">
            <div className="flex justify-center">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 animate-bounce">
                <CheckCircle size={24} />
              </div>
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-text-primary">Palavra-passe definida!</h2>
              <p className="text-xs text-text-secondary">Redirecionando para o painel de controlo...</p>
            </div>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSetPassword} className="space-y-4 text-left">
            {/* Error Alert */}
            {errorMsg && (
              <div className="flex items-start gap-2 border border-brand-error/20 bg-brand-error/5 p-3 rounded text-xs text-brand-error text-left">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <p className="leading-normal">{errorMsg}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="pass" className="text-xs font-semibold text-text-secondary">Nova Palavra-passe *</label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 -translate-y-1/2 text-text-secondary" size={14} />
                <input
                  id="pass"
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-background border border-border-custom rounded-md py-2 pl-9 pr-4 text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmPass" className="text-xs font-semibold text-text-secondary">Confirmar Palavra-passe *</label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 -translate-y-1/2 text-text-secondary" size={14} />
                <input
                  id="confirmPass"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-background border border-border-custom rounded-md py-2 pl-9 pr-4 text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 bg-brand-primary text-background font-semibold py-2 rounded-md text-xs hover:opacity-90 transition-opacity cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  <span>A gravar...</span>
                </>
              ) : (
                <span>Confirmar e Entrar</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
