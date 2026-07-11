'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ListTodo, 
  Files, 
  Calendar, 
  Users, 
  ArrowRight,
  Loader2,
  CalendarDays
} from 'lucide-react'
import { taskService } from '@/services/taskService'
import { eventService, EventItem } from '@/services/eventService'
import { profileService, UserProfile } from '@/services/profileService'
import { documentService } from '@/services/documentService'
import EventCard from '@/components/EventCard'

export default function Home() {
  const [tasksCount, setTasksCount] = useState({ active: 0, total: 0 })
  const [events, setEvents] = useState<EventItem[]>([])
  const [staffCount, setStaffCount] = useState(1)
  const [docsCount, setDocsCount] = useState(0)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Initialize local mode and fetch data
  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // Load current user profile
      const profile = await profileService.getProfile().catch(() => null)
      setCurrentUser(profile)
      // Load tasks to update stats
      const tasks = await taskService.getTasks()
      const activeTasks = tasks.filter(t => !t.completed).length
      setTasksCount({ active: activeTasks, total: tasks.length })

      // Load events
      const eventData = await eventService.getEvents()
      setEvents(eventData)

      // Load staff count
      const staffTotal = await profileService.getProfilesCount()
      setStaffCount(staffTotal)

      // Load documents count
      const docs = await documentService.getDocuments()
      setDocsCount(docs.length)
    } catch (e) {
      console.error('Failed to load dashboard data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadDashboardData()
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [])

  const handleDeleteEvent = async (id: string) => {
    try {
      await eventService.deleteEvent(id)
      setEvents((prev) => prev.filter(e => e.id !== id))
    } catch (e) {
      console.error('Failed to delete event:', e)
    }
  }

  const now = new Date().getTime()
  
  // Future or ongoing events (sorted ascending: next event first)
  const upcomingEvents = events.filter(e => {
    const endTime = new Date(e.end_time).getTime()
    return endTime >= now
  }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  // Past events
  const pastEventsCount = events.filter(e => {
    const endTime = new Date(e.end_time).getTime()
    return endTime < now
  }).length

  // Stats cards
  const stats = [
    { 
      name: 'Membros do Staff', 
      value: loading ? '...' : staffCount.toString(), 
      icon: Users, 
      description: 'Organização activa' 
    },
    { 
      name: 'Tarefas Pendentes', 
      value: loading ? '...' : tasksCount.active.toString(), 
      icon: ListTodo, 
      description: loading ? 'A carregar...' : `${tasksCount.total - tasksCount.active} concluídas` 
    },
    { 
      name: 'Documentos Úteis', 
      value: loading ? '...' : docsCount.toString(), 
      icon: Files, 
      description: 'Partilhados no Storage' 
    },
    { 
      name: 'Atividades Agendadas', 
      value: loading ? '...' : upcomingEvents.length.toString(), 
      icon: Calendar, 
      description: loading ? 'A carregar...' : `${pastEventsCount} terminadas` 
    }
  ]

  return (
    <div className="space-y-8 w-full">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            Visão Geral do Evento
          </h1>
          <p className="text-text-secondary text-sm mt-1">
            Coordenador central do staff. Acompanha os principais indicadores e próximas atividades.
          </p>
        </div>
      </div>

      {/* Stats cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div 
              key={stat.name} 
              className="border border-border-custom bg-secondary-bg p-5 rounded-lg transition-all hover:bg-background/40"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary font-medium">{stat.name}</span>
                <Icon size={18} className="text-text-secondary" strokeWidth={1.5} />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold tracking-tight text-text-primary">{stat.value}</span>
              </div>
              <p className="mt-1 text-xs text-text-secondary">{stat.description}</p>
            </div>
          )
        })}
      </div>

      {/* Split layout: Upcoming Events on Left, Widget boxes on Right */}
      <div className="grid gap-6 lg:grid-cols-3 items-start">
        
        {/* Left Column: Upcoming events list (Top 4) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="border border-border-custom bg-secondary-bg p-5 rounded-lg space-y-5">
            <div className="flex items-center justify-between border-b border-border-custom/50 pb-3">
              <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Próximas Atividades (Agenda)</h2>
              <Link 
                href="/calendario" 
                className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-0.5 font-medium"
              >
                <span>Abrir Calendário</span>
                <ArrowRight size={12} />
              </Link>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="animate-spin text-text-secondary" size={20} strokeWidth={1.5} />
                </div>
              ) : upcomingEvents.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 items-start">
                  {upcomingEvents.slice(0, 4).map(event => (
                    <div key={event.id} className="text-left">
                      <EventCard event={event} onDelete={handleDeleteEvent} currentUser={currentUser} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <CalendarDays size={28} className="text-text-secondary mb-2.5 opacity-40" />
                  <span className="text-xs font-semibold text-text-primary">Sem atividades futuras</span>
                  <p className="text-[11px] text-text-secondary max-w-xs mt-1">
                    Não existem sessões agendadas nas próximas horas. Adiciona novos eventos no teu calendário.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Widgets */}
        <div className="lg:col-span-1 space-y-6">
          {/* Tasks Summary Widget */}
          <div className="border border-border-custom bg-secondary-bg p-6 rounded-lg space-y-4">
            <div className="flex items-center justify-between border-b border-border-custom/50 pb-3">
              <h2 className="text-sm font-semibold text-text-primary">Minhas Tarefas</h2>
              <Link 
                href="/tarefas" 
                className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-0.5"
              >
                <span>Ver todas</span>
                <ArrowRight size={12} />
              </Link>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span>Estado de afazeres</span>
                <span className="font-semibold text-text-primary">
                  {loading ? '...' : `${tasksCount.total - tasksCount.active} de ${tasksCount.total} concluídas`}
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="h-1.5 w-full bg-border-custom rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand-primary transition-all duration-500" 
                  style={{ 
                    width: tasksCount.total > 0 
                      ? `${((tasksCount.total - tasksCount.active) / tasksCount.total) * 100}%` 
                      : '0%' 
                  }}
                />
              </div>
              
              <p className="text-[11px] text-text-secondary leading-relaxed pt-1">
                Foca-te em concluir as tarefas marcadas como prioritárias para o teu departamento.
              </p>
            </div>
          </div>

          {/* Quick Links / Docs */}
          <div className="border border-border-custom bg-secondary-bg p-6 rounded-lg space-y-4">
            <h2 className="text-sm font-semibold text-text-primary">Repositório de Ficheiros</h2>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              O upload de regulamentos de competições, layouts de salas e orçamentos está disponível no separador de Documentos.
            </p>
            <Link
              href="/documentos"
              className="inline-flex w-full items-center justify-center gap-2 border border-border-custom rounded-md py-2 text-xs font-semibold text-text-primary hover:bg-background transition-colors"
            >
              <span>Aceder a Documentos</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
