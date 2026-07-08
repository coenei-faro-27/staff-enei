'use client'

import React, { useState, useEffect } from 'react'
import { X, Calendar, MapPin, Clock, AlignLeft, Loader2 } from 'lucide-react'
import { profileService, UserProfile } from '@/services/profileService'
import { createClient } from '@/utils/supabase/client'

interface EventFormModalProps {
  isOpen: boolean
  onClose: () => void
  onAddEvent: (
    title: string,
    description: string,
    startTime: string,
    endTime: string,
    location: string,
    department?: string | null,
    assignedTo?: string | null
  ) => void
}

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && !url.includes('your-project') && !key.includes('your-anon-key')
}

export default function EventFormModal({ isOpen, onClose, onAddEvent }: EventFormModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [department, setDepartment] = useState('')
  const [assignedTo, setAssignedTo] = useState('')
  const [visibility, setVisibility] = useState<'private' | 'department'>('private')
  const [errorMsg, setErrorMsg] = useState('')
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
    if (!isOpen) return

    const loadFormData = async () => {
      setLoading(true)
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
            allProfiles = JSON.parse(stored).filter((u: { is_active: boolean }) => u.is_active)
          } else {
            allProfiles = [profile]
          }
        } else {
          const supabase = createClient()
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('is_active', true)
          allProfiles = data || []
        }

        // Filter members based on hierarchy rules
        const userRole = profile.role?.toLowerCase()
        if (userRole === 'admin' || profile.department === 'Mesa') {
          setMembers(allProfiles)
        } else if (userRole === 'diretor' || userRole === 'co-diretor') {
          const deptMembers = allProfiles.filter(p => p.department === profile.department)
          setMembers(deptMembers)
        } else {
          setMembers([]) // members cannot assign tasks to others
        }
      } catch (e) {
        console.error('Failed to load event form modal data:', e)
      } finally {
        setLoading(false)
      }
    }

    loadFormData()
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!title.trim() || !startTime || !endTime || !currentUser) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios (*).')
      return
    }

    const start = new Date(startTime).getTime()
    const end = new Date(endTime).getTime()

    if (end <= start) {
      setErrorMsg('A data/hora de fim deve ser posterior à data/hora de início.')
      return
    }

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

    onAddEvent(
      title.trim(),
      description.trim(),
      startTime,
      endTime,
      location.trim(),
      finalDept,
      finalAssignedTo
    )
    
    // Reset values and close
    setTitle('')
    setDescription('')
    setLocation('')
    setStartTime('')
    setEndTime('')
    setAssignedTo('')
    onClose()
  }

  const roleLower = currentUser?.role?.toLowerCase()
  const isMembro = currentUser?.department !== 'Mesa' && roleLower === 'membro'
  const isDiretorCo = currentUser?.department !== 'Mesa' && (roleLower === 'diretor' || roleLower === 'co-diretor')

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Modal Card container */}
      <div 
        className="border border-border-custom bg-secondary-bg rounded-lg max-w-lg w-full shadow-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-custom px-5 py-4 bg-background/50">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-text-primary" />
            <h3 className="font-semibold text-text-primary text-base">Novo Evento / Atividade</h3>
          </div>
          <button 
            onClick={onClose}
            className="border border-border-custom p-1.5 rounded-md hover:bg-background text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Content Form */}
        {loading ? (
          <div className="flex h-48 items-center justify-center bg-secondary-bg">
            <Loader2 className="animate-spin text-text-secondary" size={24} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
            {errorMsg && (
              <div className="text-xs font-medium text-red-500 border border-red-500/20 bg-red-500/5 p-3 rounded-md text-left">
                {errorMsg}
              </div>
            )}

            {/* Title */}
            <div className="flex flex-col gap-1.5 text-left">
              <label htmlFor="event-title" className="text-xs font-semibold text-text-primary">
                Título do Evento *
              </label>
              <input
                id="event-title"
                type="text"
                required
                placeholder="Ex: Cerimónia de Encerramento, Keynote, etc."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border border-border-custom bg-background text-text-primary focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none rounded-md px-3 py-2 text-sm w-full transition-colors"
              />
            </div>

            {/* Times Grid */}
            <div className="grid gap-4 sm:grid-cols-2 text-left">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="event-start" className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                  <Clock size={12} />
                  Início *
                </label>
                <input
                  id="event-start"
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="border border-border-custom bg-background text-text-primary focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none rounded-md px-3 py-2 text-sm w-full transition-colors cursor-pointer"
                />
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label htmlFor="event-end" className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                  <Clock size={12} />
                  Fim *
                </label>
                <input
                  id="event-end"
                  type="datetime-local"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="border border-border-custom bg-background text-text-primary focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none rounded-md px-3 py-2 text-sm w-full transition-colors cursor-pointer"
                />
              </div>
            </div>

            {/* Location */}
            <div className="flex flex-col gap-1.5 text-left">
              <label htmlFor="event-loc" className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <MapPin size={12} />
                Localização
              </label>
              <input
                id="event-loc"
                type="text"
                placeholder="Ex: Auditório Principal, Sala 2.1..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="border border-border-custom bg-background text-text-primary focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none rounded-md px-3 py-2 text-sm w-full transition-colors"
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5 text-left">
              <label htmlFor="event-desc" className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                <AlignLeft size={12} />
                Descrição / Notas
              </label>
              <textarea
                id="event-desc"
                rows={2}
                placeholder="Notas adicionais sobre oradores, suporte técnico, material necessário, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border border-border-custom bg-background text-text-primary focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none rounded-md px-3 py-2 text-sm w-full transition-colors resize-none"
              />
            </div>

            {/* Conditional Permissions Fields */}
            {isMembro ? (
              /* Member Toggles visibility */
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-semibold text-text-primary">
                  Visibilidade do Evento *
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
                    Privado
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
              /* Admin, Mesa, Directors */
              <div className="grid gap-4 sm:grid-cols-2 text-left">
                {/* Department */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="event-dept" className="text-xs font-semibold text-text-primary">
                    Departamento
                  </label>
                  <select
                    id="event-dept"
                    value={department}
                    disabled={isDiretorCo}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="border border-border-custom bg-background text-text-primary focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none rounded-md px-3 py-2 text-sm w-full transition-colors cursor-pointer disabled:opacity-80"
                  >
                    <option value="">Geral (Público)</option>
                    {departments.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>

                {/* Assignee */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="event-assignee" className="text-xs font-semibold text-text-primary">
                    Atribuir a
                  </label>
                  <select
                    id="event-assignee"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="border border-border-custom bg-background text-text-primary focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none rounded-md px-3 py-2 text-sm w-full transition-colors cursor-pointer"
                  >
                    <option value="">Não atribuído</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Actions Footer */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-custom bg-background/50 -mx-5 -mb-5 px-5 py-4">
              <button
                type="button"
                onClick={onClose}
                className="border border-border-custom text-text-primary bg-transparent hover:bg-background font-medium rounded-md px-4 py-2.5 text-sm transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-brand-primary text-background font-medium rounded-md px-4 py-2.5 text-sm hover:opacity-90 transition-all cursor-pointer active:scale-[0.98]"
              >
                Criar Evento
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
