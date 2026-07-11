'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  UserPlus,
  Loader2,
  Check,
  AlertCircle,
  X,
  Mail,
  UserCheck,
  UserMinus,
  Lock,
  CheckCircle,
  KeyRound
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { profileService, UserProfile } from '@/services/profileService'
import { inviteUserAction, updateUserRoleAndDeptAction, setUserActiveAction, sendPasswordResetAction } from '@/app/actions/adminActions'

interface AdminProfile extends UserProfile {
  email?: string | null
  login_email?: string | null
}

const DEPARTMENT_ROLES: Record<string, { value: string; label: string }[]> = {
  Mesa: [
    { value: 'Presidente', label: 'Presidente' },
    { value: 'Vice-Presidente', label: 'Vice-Presidente' },
    { value: 'Administrador', label: 'Administrador' },
    { value: 'Tesoureiro', label: 'Tesoureiro' },
    { value: 'Representante de LEI', label: 'Representante de LEI' },
    { value: 'Representante de Lesti', label: 'Representante de Lesti' },
    { value: 'Representante de EEC', label: 'Representante de EEC' },
    { value: 'Secretário', label: 'Secretário' },
    { value: 'Secretária', label: 'Secretária' }
  ],
  Logística: [
    { value: 'Diretor', label: 'Diretor' },
    { value: 'Co-diretor', label: 'Co-diretor' },
    { value: 'Membro', label: 'Membro' }
  ],
  Marketing: [
    { value: 'Diretor', label: 'Diretor' },
    { value: 'Co-diretor', label: 'Co-diretor' },
    { value: 'Membro', label: 'Membro' }
  ],
  Atividades: [
    { value: 'Diretor', label: 'Diretor' },
    { value: 'Co-diretor', label: 'Co-diretor' },
    { value: 'Membro', label: 'Membro' }
  ],
  Tecnologia: [
    { value: 'Diretor', label: 'Diretor' },
    { value: 'Co-diretor', label: 'Co-diretor' },
    { value: 'Membro', label: 'Membro' }
  ],
  Comercial: [
    { value: 'Diretor', label: 'Diretor' },
    { value: 'Co-diretor', label: 'Co-diretor' },
    { value: 'Membro', label: 'Membro' }
  ]
}

const DEPARTMENTS = ['Mesa', 'Logística', 'Marketing', 'Atividades', 'Tecnologia', 'Comercial']

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && !url.includes('your-project') && !key.includes('your-anon-key')
}

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<AdminProfile[]>([])
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [currentAdmin, setCurrentAdmin] = useState<UserProfile | null>(null)

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('')
  const [realEmail, setRealEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('')
  const [inviteDept, setInviteDept] = useState('')
  const [inviting, setInviting] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState<{
    loginEmail: string
    realEmail: string
  } | null>(null)

  // Toast status state
  const [toast, setToast] = useState<{
    type: 'success' | 'error' | 'delete'
    message: string
  } | null>(null)

  const showToast = (type: 'success' | 'error' | 'delete', message: string) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  const loadProfiles = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      // Local Mode simulation users
      const stored = localStorage.getItem('enei_simulated_users')
      if (stored) {
        const parsed = JSON.parse(stored).map((u: UserProfile) => ({
          ...u,
          account_state: u.account_state || (u.is_pending ? 'pending' : u.is_active !== false ? 'active' : 'inactive')
        }))
        setProfiles(parsed)
        return
      }

      const localUser = await profileService.getProfile()
      const mockUsers: AdminProfile[] = [
        { ...localUser, email: 'david@enei.pt', role: 'admin', department: 'Mesa', account_state: 'active' },
        { id: 'user-2', full_name: 'Ana Silva', email: 'ana.silva@enei.pt', role: 'Presidente', department: 'Mesa', avatar_color: 'bg-emerald-500', account_state: 'active' },
        { id: 'user-3', full_name: 'Pedro Santos', email: 'pedro.santos@enei.pt', role: 'Diretor', department: 'Logística', avatar_color: 'bg-amber-500', account_state: 'active' },
        { id: 'user-4', full_name: 'Inês Costa', email: 'ines.costa@enei.pt', role: 'Co-diretor', department: 'Marketing', avatar_color: 'bg-rose-500', account_state: 'active' },
        { id: 'user-5', full_name: 'Rita Oliveira', email: 'rita.oliveira@enei.pt', role: 'Membro', department: 'Marketing', avatar_color: 'bg-violet-500', account_state: 'inactive' }
      ]
      localStorage.setItem('enei_simulated_users', JSON.stringify(mockUsers))
      setProfiles(mockUsers)
      return
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true })

      if (error) throw error
      const normalized = (data || []).map((u: UserProfile) => ({
        ...u,
        account_state: u.account_state || (u.is_pending ? 'pending' : u.is_active !== false ? 'active' : 'inactive')
      }))
      setProfiles(normalized)
    } catch (e) {
      console.error('Failed to load profiles:', e)
      showToast('error', 'Falha ao carregar utilizadores da base de dados.')
    }
  }, [])

  // Check auth and role
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const profile = await profileService.getProfile()
        setCurrentAdmin(profile)
        
        // Restrict admin access in Supabase mode
        if (isSupabaseConfigured() && profile.role !== 'admin') {
          router.push('/')
          return
        }
        
        await loadProfiles()
      } catch (e) {
        console.error('Admin access check failed:', e)
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    checkAdminAccess()
  }, [router, loadProfiles])

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim() || !realEmail.trim()) return

    setInviting(true)
    try {
      const result = await inviteUserAction(
        inviteEmail.trim(),
        realEmail.trim(),
        inviteRole,
        inviteDept
      )
      
      if (result.success) {
        showToast('success', `Convite enviado com sucesso!`)
        setCreatedCredentials({
          loginEmail: `${inviteEmail.trim()}@coenei.pt`,
          realEmail: realEmail.trim()
        })
        
        // Clear input form fields
        setInviteEmail('')
        setRealEmail('')
        
        if (!isSupabaseConfigured()) {
          // Update local simulation
          const newSimulated: AdminProfile = {
            id: `sim-${Math.random().toString(36).substring(2, 9)}`,
            full_name: realEmail.split('@')[0],
            email: realEmail.trim(),
            login_email: `${inviteEmail.trim()}@coenei.pt`,
            role: inviteRole,
            department: inviteDept,
            avatar_color: 'bg-indigo-500',
            account_state: 'pending'
          }
          const updated = [...profiles, newSimulated]
          localStorage.setItem('enei_simulated_users', JSON.stringify(updated))
          setProfiles(updated)
        } else {
          await loadProfiles()
        }
      } else {
        showToast('error', result.error || 'Erro ao convidar utilizador.')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ocorreu um erro ao convidar utilizador.'
      showToast('error', msg)
    } finally {
      setInviting(false)
    }
  }

  const openInviteModal = () => {
    setInviteEmail('')
    setRealEmail('')
    setInviteRole('')
    setInviteDept('')
    setCreatedCredentials(null)
    setIsInviteModalOpen(true)
  }

  const handleRoleDeptChange = async (userId: string, newRole: string, newDept: string) => {
    let finalRole = newRole
    const user = profiles.find(p => p.id === userId)
    if (user && user.department !== newDept) {
      if (newDept === 'Mesa') {
        const validRoles = DEPARTMENT_ROLES.Mesa.map(r => r.value)
        if (!validRoles.includes(newRole)) {
          finalRole = 'Presidente'
        }
      } else {
        const validRoles = ['Diretor', 'Co-diretor', 'Membro']
        if (!validRoles.includes(newRole)) {
          finalRole = 'Membro'
        }
      }
    }

    try {
      const result = await updateUserRoleAndDeptAction(userId, finalRole, newDept)
      
      if (result.success) {
        showToast('success', 'Utilizador atualizado com sucesso!')
        
        // Update state locally
        setProfiles(prev => 
          prev.map(p => p.id === userId ? { ...p, role: finalRole, department: newDept } : p)
        )
        
        if (!isSupabaseConfigured()) {
          const updated = profiles.map(p => p.id === userId ? { ...p, role: finalRole, department: newDept } : p)
          localStorage.setItem('enei_simulated_users', JSON.stringify(updated))
        }
      } else {
        showToast('error', result.error || 'Falha ao atualizar utilizador.')
      }
    } catch {
      showToast('error', 'Ocorreu um erro ao gravar alterações.')
    }
  }

  const handleResetPassword = async (email: string | null | undefined) => {
    if (!email) {
      showToast('error', 'Este utilizador não possui um e-mail real associado.')
      return
    }
    
    try {
      const result = await sendPasswordResetAction(email)
      if (result.success) {
        showToast('success', `E-mail de reset enviado para ${email}!`)
      } else {
        showToast('error', result.error || 'Falha ao enviar e-mail de reset.')
      }
    } catch {
      showToast('error', 'Ocorreu um erro ao enviar e-mail de reset.')
    }
  }

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    const nextState = currentActive ? 'inactive' : 'active'
    try {
      const result = await setUserActiveAction(userId, !currentActive)
      
      if (result.success) {
        showToast(
          !currentActive ? 'success' : 'delete', 
          !currentActive ? 'Utilizador ativado com sucesso.' : 'Utilizador desativado com sucesso (Soft Delete).'
        )
        
        // Update state locally
        setProfiles(prev => 
          prev.map(p => p.id === userId ? { ...p, account_state: nextState } : p)
        )
        
        if (!isSupabaseConfigured()) {
          const updated = profiles.map(p => p.id === userId ? { ...p, account_state: nextState } : p)
          localStorage.setItem('enei_simulated_users', JSON.stringify(updated))
        }
      } else {
        showToast('error', result.error || 'Falha ao alterar estado do utilizador.')
      }
    } catch {
      showToast('error', 'Erro ao alterar estado do utilizador.')
    }
  }

  const getInitials = (n: string) => {
    const parts = n.trim().split(/\s+/)
    if (parts.length === 0 || !parts[0]) return '?'
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const handleSimulateLogin = async (userId: string) => {
    try {
      if (!isSupabaseConfigured()) {
        const updated = profiles.map(p => p.id === userId ? { ...p, account_state: 'active' } : p)
        localStorage.setItem('enei_simulated_users', JSON.stringify(updated))
        setProfiles(updated)
        showToast('success', 'Simulação: Primeiro login efetuado com sucesso!')
      }
    } catch {
      showToast('error', 'Erro ao simular primeiro login.')
    }
  }

  const pendingProfiles = profiles.filter(p => p.account_state === 'pending')
  const regularProfiles = profiles.filter(p => p.account_state !== 'pending')

  const renderUserTable = (usersList: AdminProfile[], isPendingSection: boolean) => {
    return (
      <div className="border border-border-custom bg-secondary-bg rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-border-custom bg-background/50 text-text-secondary uppercase tracking-wider font-semibold">
                <th className="p-4 select-none">Membro</th>
                <th className="p-4 select-none">Email</th>
                <th className="p-4 select-none">Cargo / Permissões</th>
                <th className="p-4 select-none">Associação / Departamento</th>
                <th className="p-4 select-none">Estado</th>
                <th className="p-4 select-none text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom/50">
              {usersList.map((user) => {
                const isUserInactive = user.account_state === 'inactive'
                const isUserNotInactive = user.account_state !== 'inactive'
                return (
                  <tr 
                    key={user.id} 
                    className={`transition-colors hover:bg-background/20 ${
                      isUserInactive ? 'opacity-50 bg-background/10' : ''
                    }`}
                  >
                    {/* Name and Initials */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-md flex items-center justify-center font-bold text-white shadow-sm shrink-0 select-none ${user.avatar_color}`}>
                          {getInitials(user.full_name)}
                        </div>
                        <div>
                          <span className={`font-semibold text-text-primary block ${isUserInactive ? 'line-through opacity-60' : ''}`}>
                            {user.full_name}
                          </span>
                          {user.login_email && (
                            <span className="text-[10px] text-text-secondary block font-mono">
                              @{user.login_email.split('@')[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="p-4 text-text-secondary font-medium">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-text-primary block text-xs" title="E-mail Real (Contacto)">
                          {user.email || 'Não associado'}
                        </span>
                        {user.login_email && (
                          <span className="text-[10px] text-brand-primary block font-semibold font-mono" title="E-mail de Login">
                            {user.login_email}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Role Dropdown */}
                    <td className="p-4">
                      <select
                        value={user.role}
                        disabled={isUserInactive || user.id === currentAdmin?.id}
                        onChange={(e) => handleRoleDeptChange(user.id, e.target.value, user.department)}
                        className="border border-border-custom bg-background text-text-primary focus:border-brand-primary focus:outline-none rounded-md px-2 py-1 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                      >
                        {user.role === 'admin' && (
                          <option value="admin">Admin</option>
                        )}
                        {(DEPARTMENT_ROLES[user.department] || [
                          { value: 'Diretor', label: 'Diretor' },
                          { value: 'Co-diretor', label: 'Co-diretor' },
                          { value: 'Membro', label: 'Membro' }
                        ]).map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </td>

                    {/* Dept Dropdown */}
                    <td className="p-4">
                      <select
                        value={user.department}
                        disabled={isUserInactive || user.id === currentAdmin?.id}
                        onChange={(e) => handleRoleDeptChange(user.id, user.role, e.target.value)}
                        className="border border-border-custom bg-background text-text-primary focus:border-brand-primary focus:outline-none rounded-md px-2 py-1 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                      >
                        {DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </td>

                    {/* Active/Inactive/Pending Badge */}
                    <td className="p-4">
                      {isPendingSection ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
                          Pendente
                        </span>
                      ) : user.account_state === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
                          Inativo
                        </span>
                      )}
                    </td>

                    {/* Actions Toggle Active/Inactive */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {user.id !== currentAdmin?.id ? (
                          <>
                            {/* Simulate Login (only local mode and if pending) */}
                            {!isSupabaseConfigured() && isPendingSection && (
                              <button
                                onClick={() => handleSimulateLogin(user.id)}
                                className="inline-flex items-center justify-center p-1.5 rounded-md border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-950/40 transition-all cursor-pointer animate-pulse"
                                title="Simular Primeiro Login"
                              >
                                <CheckCircle size={14} />
                              </button>
                            )}

                            {/* Reset Password Button */}
                            <button
                              onClick={() => handleResetPassword(user.email)}
                              disabled={!user.email || isUserInactive}
                              className="inline-flex items-center justify-center p-1.5 rounded-md border border-brand-primary/20 text-brand-primary hover:bg-brand-primary hover:text-background transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Enviar Reset de Password"
                            >
                              <KeyRound size={14} />
                            </button>

                            {/* Toggle Active/Inactive Button */}
                            <button
                              onClick={() => handleToggleActive(user.id, isUserNotInactive)}
                              className={`inline-flex items-center justify-center p-1.5 rounded-md border transition-all cursor-pointer ${
                                isUserNotInactive
                                  ? 'border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white dark:hover:bg-red-950/40'
                                  : 'border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-950/40'
                              }`}
                              title={isUserNotInactive ? "Desativar Conta" : "Ativar Conta"}
                            >
                              {isUserNotInactive ? <UserMinus size={14} /> : <UserCheck size={14} />}
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-text-secondary select-none font-medium italic pr-2">
                            Sua Conta
                        </span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Administração de Utilizadores</h1>
          <p className="text-sm text-text-secondary">
            Gere cargos, departamentos, ativa/desativa contas da equipa e envia convites de acesso.
          </p>
        </div>

        <button
          onClick={openInviteModal}
          className="inline-flex items-center justify-center gap-2 bg-brand-primary text-background font-semibold rounded-md px-4 py-2.5 text-xs hover:opacity-90 transition-all cursor-pointer shadow self-start sm:self-auto"
        >
          <UserPlus size={14} />
          <span>Convidar Utilizador</span>
        </button>
      </div>

      {/* Pending Members Card */}
      {pendingProfiles.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">Membros Pendentes ({pendingProfiles.length})</h2>
          {renderUserTable(pendingProfiles, true)}
        </div>
      )}

      {/* Regular Members Card */}
      <div className="space-y-3">
        {pendingProfiles.length > 0 && (
          <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">Membros Ativos ({regularProfiles.length})</h2>
        )}
        {renderUserTable(regularProfiles, false)}
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="border border-border-custom bg-secondary-bg rounded-lg max-w-md w-full shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-border-custom px-5 py-4 bg-background/50">
              <span className="font-semibold text-text-primary text-sm flex items-center gap-2">
                <UserPlus size={16} className="text-brand-primary" />
                <span>{createdCredentials ? 'Conta Criada' : 'Convidar Novo Utilizador'}</span>
              </span>
              <button
                onClick={() => {
                  setCreatedCredentials(null)
                  setIsInviteModalOpen(false)
                }}
                className="border border-border-custom p-1.5 rounded-md hover:bg-background text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {createdCredentials ? (
              <div className="p-5 space-y-4 text-left">
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-md p-3.5 text-xs flex gap-2.5 items-start">
                  <CheckCircle size={16} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-text-primary">Convite enviado com sucesso!</p>
                    <p className="text-text-secondary mt-1 leading-normal">
                      O utilizador recebeu um e-mail de confirmação para ativar a conta e definir a sua palavra-passe.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 bg-background/50 rounded-md p-4 border border-border-custom text-xs">
                  <div>
                    <span className="text-text-secondary block font-medium mb-0.5">E-mail de Login na Plataforma:</span>
                    <span className="font-mono text-text-primary block bg-background px-2.5 py-1.5 rounded border border-border-custom/50 font-semibold">{createdCredentials.loginEmail}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary block font-medium mb-0.5">Destinatário do Convite:</span>
                    <span className="font-mono text-text-secondary block bg-background px-2.5 py-1.5 rounded border border-border-custom/50">{createdCredentials.realEmail}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setCreatedCredentials(null)
                    setIsInviteModalOpen(false)
                  }}
                  className="w-full bg-brand-primary text-background font-semibold rounded-md py-2.5 text-xs hover:opacity-90 transition-all cursor-pointer shadow text-center mt-2"
                >
                  Concluir
                </button>
              </div>
            ) : (
              <form onSubmit={handleInviteUser} className="p-5 space-y-4 text-left">
                {/* Email de Login */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-secondary">
                    E-mail de Login (Plataforma)
                  </label>
                  <div className="flex items-stretch rounded-md overflow-hidden border border-border-custom bg-background focus-within:border-brand-primary focus-within:ring-1 focus-within:ring-brand-primary transition-colors">
                    <div className="pl-3 flex items-center justify-center text-text-secondary">
                      <Lock size={14} />
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="exemplo"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value.replace(/\s+/g, '').replace(/@.*/g, ''))}
                      className="bg-transparent text-text-primary focus:outline-none rounded-none px-3 py-2 text-xs flex-1 min-w-0 border-0"
                    />
                    <div className="bg-background/80 px-3.5 flex items-center border-l border-border-custom text-xs font-semibold text-text-secondary select-none">
                      @coenei.pt
                    </div>
                  </div>
                  <span className="text-[10px] text-text-secondary leading-normal">
                    Este será o e-mail oficial para iniciar sessão na plataforma: <strong className="font-mono text-text-primary">{inviteEmail || 'exemplo'}@coenei.pt</strong>.
                  </span>
                </div>

                {/* Email Real */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-secondary">
                    E-mail Real (Válido/Contacto)
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-3 text-text-secondary" />
                    <input
                      type="email"
                      required
                      placeholder="exemplo@gmail.com"
                      value={realEmail}
                      onChange={(e) => setRealEmail(e.target.value)}
                      className="border border-border-custom bg-background text-text-primary focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none rounded-md pl-9 pr-3.5 py-2 text-xs w-full transition-colors"
                    />
                  </div>
                  <span className="text-[10px] text-text-secondary leading-normal">
                    O utilizador receberá o convite para definir a sua palavra-passe neste e-mail.
                  </span>
                </div>

                {/* Dept */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-secondary">Departamento</label>
                  <select
                    value={inviteDept}
                    onChange={(e) => {
                      const dept = e.target.value
                      setInviteDept(dept)
                      if (dept && DEPARTMENT_ROLES[dept]) {
                        setInviteRole(DEPARTMENT_ROLES[dept][0].value)
                      } else {
                        setInviteRole('')
                      }
                    }}
                    className="border border-border-custom bg-background text-text-primary focus:border-brand-primary focus:outline-none rounded-md px-3 py-2 text-xs w-full cursor-pointer"
                  >
                    <option value="">-- Escolher Departamento --</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Role / Cargo */}
                {inviteDept ? (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-text-secondary">Cargo</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="border border-border-custom bg-background text-text-primary focus:border-brand-primary focus:outline-none rounded-md px-3 py-2 text-xs w-full cursor-pointer"
                    >
                      {(DEPARTMENT_ROLES[inviteDept] || []).map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="border border-border-custom border-dashed bg-background/30 rounded-md p-3.5 text-center text-[10px] text-text-secondary">
                    Por favor, selecione um departamento primeiro para atribuir o cargo correspondente.
                  </div>
                )}

                {/* Submit Buttons */}
                <div className="flex gap-2 pt-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="border border-border-custom px-4 py-2 rounded-md hover:bg-background text-xs font-semibold text-text-primary cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={inviting || !inviteEmail.trim() || !realEmail.trim()}
                    className="bg-brand-primary text-background font-semibold rounded-md px-4 py-2 text-xs hover:opacity-90 transition-all cursor-pointer shadow flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {inviting ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>A Enviar...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus size={13} />
                        <span>Convidar</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 border border-border-custom bg-secondary-bg/95 backdrop-blur-md p-4 rounded-lg shadow-2xl flex gap-3 text-xs w-80 sm:w-96 text-left animate-slide-down select-none">
          <div className={`h-6 w-6 rounded-full border flex items-center justify-center shrink-0 ${
            toast.type === 'success' 
              ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500' 
              : toast.type === 'delete'
              ? 'border-red-500/20 bg-red-500/5 text-red-500'
              : 'border-blue-500/20 bg-blue-500/5 text-blue-500'
          }`}>
            {toast.type === 'success' ? (
              <Check size={14} strokeWidth={2.5} />
            ) : toast.type === 'delete' ? (
              <UserMinus size={14} strokeWidth={1.5} />
            ) : (
              <AlertCircle size={14} strokeWidth={1.5} />
            )}
          </div>
          <div className="space-y-0.5">
            <span className="font-bold text-text-primary text-xs block">
              {toast.type === 'success' ? 'Sucesso' : toast.type === 'delete' ? 'Desativado' : 'Erro'}
            </span>
            <p className="text-text-secondary text-[11px] leading-relaxed">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  )
}
