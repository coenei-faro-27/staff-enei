'use client'

import React, { useState, useEffect } from 'react'
import {
  User,
  Briefcase,
  Building2,
  Palette,
  LogOut,
  Check,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { profileService } from '@/services/profileService'

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form fields state
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [dept, setDept] = useState('Mesa')
  const [color, setColor] = useState('bg-indigo-500')

  // Status states
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  useEffect(() => {
    let active = true
    const fetchProfile = async () => {
      try {
        const data = await profileService.getProfile()
        if (!active) return

        let safeColor = data.avatar_color || 'bg-indigo-500'
        if (safeColor.startsWith('bg-[#')) {
          safeColor = 'bg-indigo-500' // fallback to standard Tailwind colors
        }

        setName(data.full_name)
        setRole(data.role)
        setDept(data.department)
        setColor(safeColor)
      } catch (err) {
        console.error('Failed to load profile:', err)
        setErrorMsg('Não foi possível carregar as informações do perfil.')
      } finally {
        if (active) setLoading(false)
      }
    }
    fetchProfile()
    return () => {
      active = false
    }
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !role.trim()) {
      setErrorMsg('O Nome Completo e o Cargo são campos obrigatórios.')
      return
    }

    setSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      await profileService.updateProfile({
        full_name: name.trim(),
        role: role.trim(),
        department: dept,
        avatar_color: color
      })

      if (typeof window !== 'undefined') {
        console.log('ProfilePage: dispatching profile-updated event')
        window.dispatchEvent(new Event('profile-updated'))
      }

      setSuccessMsg('Perfil atualizado com sucesso!')

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMsg(null)
      }, 3000)
    } catch (err) {
      console.error('Failed to save profile:', err)
      setErrorMsg('Ocorreu um erro ao atualizar o perfil.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    setShowLogoutConfirm(true)
  }

  const executeLogout = async () => {
    const isSupabaseConfigured = () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      return !!url && !!key && !url.includes('your-project') && !key.includes('your-anon-key')
    }

    if (isSupabaseConfigured()) {
      try {
        const { createClient: createSupabaseClient } = await import('@/utils/supabase/client')
        const supabase = createSupabaseClient()
        await supabase.auth.signOut()
      } catch (e) {
        console.error('Logout error:', e)
      }
    }

    // Clear local auth cookie and redirect
    document.cookie = "enei_local_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;"
    window.location.href = '/login'
  }

  const getInitials = (n: string) => {
    const parts = n.trim().split(/\s+/)
    if (parts.length === 0 || !parts[0]) return '?'
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 max-w-4xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Definições de Perfil</h1>
        <p className="text-sm text-text-secondary">
          Personaliza os teus dados de visualização para a equipa e o teu avatar na plataforma.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Avatar Preview */}
        <div className="md:col-span-1 flex flex-col gap-6">
          <div className="border border-border-custom bg-secondary-bg rounded-lg p-6 flex flex-col items-center text-center space-y-4">
            <div className={`h-24 w-24 rounded-lg flex items-center justify-center text-2xl font-bold text-white shadow-md transition-all duration-300 ${color}`}>
              {getInitials(name || 'Sem Nome')}
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-text-primary text-base truncate max-w-full px-2">
                {name || 'O Teu Nome'}
              </h3>
              <p className="text-xs text-text-secondary truncate max-w-full px-2 flex items-center justify-center gap-1">
                <Briefcase size={12} /> {role || 'Cargo / Função'}
              </p>
              <p className="text-[10px] text-text-secondary/70 truncate max-w-full px-2 flex items-center justify-center gap-1">
                <Building2 size={10} /> {dept}
              </p>
            </div>
          </div>

          {/* Quick Actions Container */}
          <div className="border border-border-custom bg-secondary-bg rounded-lg p-6">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 border border-brand-error/30 hover:border-brand-error bg-transparent hover:bg-brand-error/5 text-brand-error py-2 rounded-md text-xs font-semibold transition-all cursor-pointer"
            >
              <LogOut size={14} />
              Terminar Sessão
            </button>
          </div>
        </div>

        {/* Right Column: Settings Form */}
        <div className="md:col-span-2">
          <div className="border border-border-custom bg-secondary-bg rounded-lg p-6">
            <h2 className="text-sm font-semibold text-text-primary mb-5 flex items-center gap-2 pb-3 border-b border-border-custom/50">
              <User size={16} className="text-brand-primary" />
              <span>Dados Pessoais e Configuração</span>
            </h2>

            {/* Form */}

            <form onSubmit={handleSave} className="space-y-5 text-left">
              {/* Full Name */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="full-name" className="text-xs font-semibold text-text-secondary">
                  Nome Completo *
                </label>
                <input
                  id="full-name"
                  type="text"
                  required
                  placeholder="Ex: David Gonçalves"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border border-border-custom bg-background text-text-primary focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none rounded-md px-3.5 py-2.5 text-xs w-full transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Role */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="role" className="text-xs font-semibold text-text-secondary">
                    Cargo / Função *
                  </label>
                  <input
                    id="role"
                    type="text"
                    required
                    placeholder="Ex: Coordenador Geral"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="border border-border-custom bg-background text-text-primary focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none rounded-md px-3.5 py-2.5 text-xs w-full transition-colors"
                  />
                </div>

                {/* Department */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="department" className="text-xs font-semibold text-text-secondary">
                    Associação / Departamento
                  </label>
                  <select
                    id="department"
                    value={dept}
                    onChange={(e) => setDept(e.target.value)}
                    className="border border-border-custom bg-background text-text-primary focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none rounded-md px-3.5 py-2.5 text-xs w-full transition-colors cursor-pointer"
                  >
                    <option value="Mesa">Mesa</option>
                    <option value="Logística">Logística</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Atividades">Atividades</option>
                    <option value="Tecnologia">Tecnologia</option>
                    <option value="Comercial">Comercial</option>
                  </select>
                </div>
              </div>

              {/* Avatar Color Selection */}
              <div className="flex flex-col gap-2 pt-1.5">
                <label className="text-xs font-semibold text-text-secondary flex items-center gap-1.5">
                  <Palette size={13} className="text-text-secondary" />
                  Cor de Fundo do Avatar
                </label>
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {[
                    { color: 'bg-indigo-500', label: 'Índigo' },
                    { color: 'bg-emerald-500', label: 'Esmeralda' },
                    { color: 'bg-amber-500', label: 'Âmbar' },
                    { color: 'bg-rose-500', label: 'Rosa' },
                    { color: 'bg-violet-500', label: 'Violeta' },
                    { color: 'bg-sky-500', label: 'Céu' },
                  ].map((colorObj) => (
                    <button
                      key={colorObj.color}
                      type="button"
                      onClick={() => setColor(colorObj.color)}
                      className={`h-9 w-9 rounded-md cursor-pointer transition-all hover:scale-105 border flex items-center justify-center ${colorObj.color} ${color === colorObj.color
                          ? 'border-text-primary scale-105 ring-2 ring-brand-primary/20 shadow-md'
                          : 'border-transparent'
                        }`}
                      title={colorObj.label}
                    />
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end gap-2 pt-4 border-t border-border-custom/50 mt-4">
                <button
                  type="submit"
                  disabled={saving || !name.trim() || !role.trim()}
                  className={`bg-brand-primary text-background font-semibold rounded-md px-5 py-2.5 text-xs transition-all flex items-center gap-1.5 ${saving || !name.trim() || !role.trim()
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:opacity-90 cursor-pointer shadow'
                    }`}
                >
                  {saving ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>A Guardar...</span>
                    </>
                  ) : (
                    <>
                      <span>Guardar Alterações</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Floating Success Toast Notification */}
      {successMsg && (
        <div className="fixed top-6 right-6 z-50 border border-emerald-500/20 bg-secondary-bg/95 backdrop-blur-md p-4 rounded-lg shadow-2xl flex gap-3 text-xs w-80 sm:w-96 text-left animate-slide-down select-none">
          <div className="h-6 w-6 rounded-full border border-emerald-500/20 bg-emerald-500/5 flex items-center justify-center text-emerald-500 shrink-0">
            <Check size={14} strokeWidth={2.5} />
          </div>
          <div className="space-y-0.5">
            <span className="font-bold text-text-primary text-xs block">Sucesso</span>
            <p className="text-text-secondary text-[11px] leading-relaxed">{successMsg}</p>
          </div>
        </div>
      )}

      {/* Floating Error Toast Notification */}
      {errorMsg && (
        <div className="fixed top-6 right-6 z-50 border border-red-500/20 bg-secondary-bg/95 backdrop-blur-md p-4 rounded-lg shadow-2xl flex gap-3 text-xs w-80 sm:w-96 text-left animate-slide-down select-none">
          <div className="h-6 w-6 rounded-full border border-red-500/20 bg-red-500/5 flex items-center justify-center text-red-500 shrink-0">
            <AlertCircle size={14} strokeWidth={2.5} />
          </div>
          <div className="space-y-0.5">
            <span className="font-bold text-text-primary text-xs block">Erro</span>
            <p className="text-text-secondary text-[11px] leading-relaxed">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Custom Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div 
            className="border border-border-custom bg-secondary-bg rounded-lg max-w-sm w-full shadow-2xl overflow-hidden flex flex-col p-6 space-y-4 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-3 text-center">
              <div className="mx-auto h-12 w-12 rounded-full border border-red-500/20 bg-red-500/5 flex items-center justify-center text-red-500">
                <LogOut size={24} strokeWidth={1.5} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-text-primary">
                  Terminar Sessão
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Tens a certeza que pretendes terminar a sessão na plataforma?
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 border border-border-custom px-4 py-2 rounded-md hover:bg-background/80 text-xs font-medium text-text-primary transition-colors cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                onClick={executeLogout}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-md px-4 py-2 text-xs transition-all shadow cursor-pointer active:scale-[0.98] text-center"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
