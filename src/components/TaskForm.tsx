'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { profileService, UserProfile } from '@/services/profileService'
import { createClient } from '@/utils/supabase/client'

interface TaskFormProps {
  onAddTask: (title: string, department: string | null, assignedTo?: string | null) => void
}

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && !url.includes('your-project') && !key.includes('your-anon-key')
}

export default function TaskForm({ onAddTask }: TaskFormProps) {
  const [title, setTitle] = useState('')
  const [department, setDepartment] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [visibility, setVisibility] = useState<'private' | 'department'>('private')
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [members, setMembers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  const departments = [
    { label: 'Mesa', value: 'Mesa' },
    { label: 'Logística', value: 'Logística' },
    { label: 'Marketing', value: 'Marketing' },
    { label: 'Atividades', value: 'Atividades' },
    { label: 'Tecnologia', value: 'Tecnologia' },
    { label: 'Comercial', value: 'Comercial' }
  ]

  useEffect(() => {
    const loadFormData = async () => {
      try {
        const profile = await profileService.getProfile()
        setCurrentUser(profile)

        // Set default department/visibility based on role and department
        const roleLower = profile.role?.toLowerCase()
        if (profile.department === 'Mesa' || roleLower === 'admin') {
          setDepartment('Mesa')
        } else if (roleLower === 'diretor' || roleLower === 'co-diretor') {
          setDepartment(profile.department)
        } else {
          setVisibility('private')
          setDepartment('')
        }

        // Fetch active profiles
        let allProfiles: UserProfile[] = []
        if (!isSupabaseConfigured()) {
          const stored = localStorage.getItem('enei_simulated_users')
          if (stored) {
            allProfiles = JSON.parse(stored).filter((u: { account_state: string }) => u.account_state === 'active')
          } else {
            allProfiles = [profile]
          }
        } else {
          const supabase = createClient()
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('account_state', 'active')
          allProfiles = data || []
        }

        // Filter members based on hierarchy rules
        if (roleLower === 'admin' || profile.department === 'Mesa') {
          setMembers(allProfiles)
        } else if (roleLower === 'diretor' || roleLower === 'co-diretor') {
          const deptMembers = allProfiles.filter(p => p.department === profile.department)
          setMembers(deptMembers)
        } else {
          setMembers([]) // members cannot assign tasks to others
        }
      } catch (e) {
        console.error('Failed to load form data:', e)
      } finally {
        setLoading(false)
      }
    }

    loadFormData()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !currentUser) return

    let finalDept: string | null = null
    let finalAssignedTo: string | null = null

    const roleLower = currentUser.role?.toLowerCase()
    const isMembroUser = currentUser.department !== 'Mesa' && roleLower === 'membro'

    if (isMembroUser) {
      finalDept = visibility === 'department' ? currentUser.department : null
      finalAssignedTo = currentUser.id
    } else {
      finalDept = department ? department : null
      finalAssignedTo = assignedTo ? assignedTo : null
    }

    onAddTask(title.trim(), finalDept, finalAssignedTo)
    setTitle('')
    setAssignedTo('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="animate-spin text-text-secondary" size={20} strokeWidth={1.5} />
      </div>
    )
  }

  const roleLower = currentUser?.role?.toLowerCase()
  const isMembro = currentUser?.department !== 'Mesa' && roleLower === 'membro'
  const isDiretorCo = currentUser?.department !== 'Mesa' && (roleLower === 'diretor' || roleLower === 'co-diretor')

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title Input */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="task-title" className="text-xs font-semibold text-text-secondary">
          O que precisa de ser feito? *
        </label>
        <input
          id="task-title"
          type="text"
          placeholder="Ex: Reservar auditório, Validar regulamento..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border border-border-custom bg-background text-text-primary focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none rounded-md px-3 py-2 text-xs w-full transition-colors"
          required
          autoComplete="off"
        />
      </div>

      {/* Conditional Fields based on Role */}
      {isMembro ? (
        /* Member Role Toggles visibility of their own task */
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-text-secondary">
            Visibilidade da Tarefa *
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setVisibility('private')}
              className={`border p-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer text-center ${
                visibility === 'private'
                  ? 'border-brand-primary bg-background text-text-primary'
                  : 'border-border-custom bg-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              Visível apenas para mim (Privada)
            </button>
            <button
              type="button"
              onClick={() => setVisibility('department')}
              className={`border p-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer text-center ${
                visibility === 'department'
                  ? 'border-brand-primary bg-background text-text-primary'
                  : 'border-border-custom bg-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              Departamento ({currentUser?.department || ''})
            </button>
          </div>
        </div>
      ) : (
        /* Admin, Mesa, Diretor Roles */
        <>
          {/* Association Select */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="task-dept" className="text-xs font-semibold text-text-secondary">
              Associação / Departamento
            </label>
            <select
              id="task-dept"
              value={department}
              disabled={isDiretorCo} // Directors are locked to their own department
              onChange={(e) => setDepartment(e.target.value)}
              className="border border-border-custom bg-background text-text-primary focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none rounded-md px-3 py-2 text-xs w-full transition-colors cursor-pointer disabled:opacity-80"
            >
              <option value="">Individual (Privada)</option>
              {departments.map((dept) => (
                <option key={dept.value} value={dept.value}>
                  {dept.label}
                </option>
              ))}
            </select>
          </div>

          {/* Assigned To Select */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="task-assignee" className="text-xs font-semibold text-text-secondary">
              Atribuir a (Membro da equipa)
            </label>
            <select
              id="task-assignee"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="border border-border-custom bg-background text-text-primary focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none rounded-md px-3 py-2 text-xs w-full transition-colors cursor-pointer"
            >
              <option value="">Atribuir a ninguém (Não atribuída)</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.role} - {m.department})
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Action Button Container */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={!title.trim()}
          className={`flex items-center gap-1.5 bg-brand-primary text-background font-semibold rounded-md px-4 py-2 text-xs transition-all duration-200 ${
            title.trim() 
              ? 'hover:opacity-90 cursor-pointer active:scale-[0.98]' 
              : 'opacity-50 cursor-not-allowed'
          }`}
        >
          <Plus size={14} />
          <span>Criar Tarefa</span>
        </button>
      </div>
    </form>
  )
}
