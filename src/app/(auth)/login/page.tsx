'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'
import { Loader2, Lock, Mail, AlertCircle, Sparkles, CheckCircle } from 'lucide-react'
import { resolveLoginEmailAction } from '@/app/actions/adminActions'

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && !url.includes('your-project') && !key.includes('your-anon-key')
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [localMode] = useState(() => !isSupabaseConfigured())

  // Reset password states
  const [showResetView, setShowResetView] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)

    if (localMode) {
      // Local mode authentication
      await new Promise(resolve => setTimeout(resolve, 800))
      
      if (email.trim() && password.length >= 6) {
        document.cookie = "enei_local_auth=true; path=/; max-age=86400"
        window.location.href = '/'
      } else {
        setErrorMsg('Credenciais inválidas. O e-mail deve ser preenchido e a palavra-passe deve ter pelo menos 6 caracteres.')
        setLoading(false)
      }
    } else {
      // Supabase authentication
      try {
        let finalEmail = email.trim()
        
        // Resolve platform login prefix/email to contact email
        if (!finalEmail.includes('@') || finalEmail.endsWith('@coenei.pt')) {
          const resolved = await resolveLoginEmailAction(finalEmail)
          if (resolved) {
            finalEmail = resolved
          }
        }

        const supabase = createClient()
        const { error } = await supabase.auth.signInWithPassword({
          email: finalEmail,
          password
        })

        if (error) {
          throw error
        }

        window.location.href = '/'
      } catch (err: unknown) {
        console.error('Login error:', err)
        if (err instanceof Error) {
          setErrorMsg(err.message || 'Erro ao efetuar login. Verifica as tuas credenciais.')
        } else {
          setErrorMsg('Ocorreu um erro desconhecido ao efetuar login.')
        }
        setLoading(false)
      }
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    setResetSuccess(false)

    if (localMode) {
      // Local simulation
      await new Promise(resolve => setTimeout(resolve, 800))
      setResetSuccess(true)
      setLoading(false)
    } else {
      try {
        let finalEmail = resetEmail.trim()
        
        // Resolve platform login prefix/email to contact email
        if (!finalEmail.includes('@') || finalEmail.endsWith('@coenei.pt')) {
          const resolved = await resolveLoginEmailAction(finalEmail)
          if (resolved) {
            finalEmail = resolved
          }
        }

        const supabase = createClient()
        const { error } = await supabase.auth.resetPasswordForEmail(finalEmail, {
          redirectTo: `${window.location.origin}/set-password`
        })

        if (error) {
          throw error
        }

        setResetSuccess(true)
        setLoading(false)
      } catch (err: unknown) {
        console.error('Reset password error:', err)
        setErrorMsg(err instanceof Error ? err.message : 'Erro ao enviar link de recuperação. Tente novamente.')
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
            <h1 className="text-xl font-bold tracking-tight text-text-primary">
              {showResetView ? 'Recuperar Palavra-passe' : 'ENEI 2027 Staff'}
            </h1>
            <p className="text-xs text-text-secondary">
              {showResetView 
                ? 'Introduz o teu e-mail ou username. Enviaremos um link para redefinir a tua palavra-passe.' 
                : 'Introduz os teus dados para aceder ao portal da organização.'}
            </p>
          </div>
        </div>

        {/* Local Mode Badge */}
        {localMode && (
          <div className="flex items-center gap-1.5 border border-brand-primary/20 bg-brand-primary/5 px-3 py-2 rounded text-[11px] text-text-primary">
            <Sparkles size={12} className="text-brand-primary shrink-0" />
            <p className="leading-snug">
              <strong>Modo Local Activo:</strong> {showResetView 
                ? 'Podes introduzir qualquer e-mail para simular a recuperação.' 
                : 'Podes entrar com qualquer e-mail e palavra-passe (mínimo 6 digitos).'}
            </p>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="flex items-start gap-2 border border-brand-error/20 bg-brand-error/5 p-3 rounded text-xs text-brand-error text-left">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <p className="leading-normal">{errorMsg}</p>
          </div>
        )}

        {/* Form View / Password Reset Success / Password Reset Form */}
        {showResetView ? (
          resetSuccess ? (
            <div className="space-y-4 text-center">
              <div className="flex items-center justify-center text-brand-primary">
                <CheckCircle size={32} className="text-brand-primary" />
              </div>
              <p className="text-xs text-text-primary leading-normal">
                E-mail de recuperação enviado com sucesso! Verifica a tua caixa de entrada.
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowResetView(false);
                  setResetSuccess(false);
                  setErrorMsg(null);
                }}
                className="w-full border border-border-custom py-2 rounded-md hover:bg-background text-xs font-semibold text-text-primary cursor-pointer transition-colors"
              >
                Voltar ao Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label htmlFor="reset-email" className="text-xs font-semibold text-text-secondary">E-mail ou Username de Login *</label>
                <div className="relative">
                  <Mail className="absolute top-1/2 left-3 -translate-y-1/2 text-text-secondary" size={14} />
                  <input
                    id="reset-email"
                    type="text"
                    required
                    placeholder="exemplo@coenei.pt ou username"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
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
                    <span>A enviar...</span>
                  </>
                ) : (
                  <span>Enviar Link de Recuperação</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowResetView(false);
                  setErrorMsg(null);
                }}
                className="text-xs text-brand-primary font-medium hover:underline block text-center w-full mt-2 cursor-pointer"
              >
                Voltar para o Login
              </button>
            </form>
          )
        ) : (
          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-text-secondary">E-mail ou Username de Login *</label>
              <div className="relative">
                <Mail className="absolute top-1/2 left-3 -translate-y-1/2 text-text-secondary" size={14} />
                <input
                  id="email"
                  type="text"
                  required
                  placeholder={localMode ? "admin@enei.pt" : "exemplo@coenei.pt ou apenas username"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-background border border-border-custom rounded-md py-2 pl-9 pr-4 text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="text-xs font-semibold text-text-secondary">Palavra-passe *</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetView(true);
                    setErrorMsg(null);
                  }}
                  className="text-[10px] text-brand-primary font-medium hover:underline cursor-pointer"
                >
                  Esqueceu-se?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 -translate-y-1/2 text-text-secondary" size={14} />
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                  <span>A entrar...</span>
                </>
              ) : (
                <span>Entrar na Plataforma</span>
              )}
            </button>
          </form>
        )}

        {/* Footer info */}
        <div className="text-center pt-2 border-t border-border-custom/50">
          <p className="text-[10px] text-text-secondary">
            {localMode 
              ? "Base de dados local em cache LocalStorage." 
              : "Base de dados e autenticação via Supabase Auth."}
          </p>
        </div>
      </div>
    </div>
  )
}
