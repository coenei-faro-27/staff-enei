'use client'

import React, { useState, useEffect } from 'react'
import { 
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  Check,
  Trash2
} from 'lucide-react'
import { eventService, EventItem } from '@/services/eventService'
import EventCard from '@/components/EventCard'
import EventFormModal from '@/components/EventFormModal'
import { profileService, UserProfile } from '@/services/profileService'

export default function CalendarioPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [calendarViewMode, setCalendarViewMode] = useState<'day' | 'week' | 'month'>('month')
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date())
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  
  // Custom Floating Toast State
  const [toast, setToast] = useState<{
    type: 'success' | 'delete' | 'error'
    message: string
  } | null>(null)

  // Load events from service
  const loadEventsAndProfile = async () => {
    setLoading(true)
    try {
      const [eventsData, profileData] = await Promise.all([
        eventService.getEvents(),
        profileService.getProfile().catch(() => null)
      ])
      setEvents(eventsData)
      setCurrentUser(profileData)
    } catch (e) {
      console.error('Failed to load events:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadEventsAndProfile()
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [])

  const handleAddEvent = async (
    title: string,
    description: string,
    startTime: string,
    endTime: string,
    location: string,
    department?: string | null,
    assignedTo?: string | null
  ) => {
    try {
      const newEvent = await eventService.createEvent(title, description, startTime, endTime, location, department, assignedTo)
      setEvents((prev) => [...prev, newEvent].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      ))
      
      // Trigger success toast
      setToast({
        type: 'success',
        message: 'Atividade adicionada ao calendário com sucesso!'
      })
      setTimeout(() => setToast(null), 3000)
    } catch (e) {
      console.error('Failed to add event:', e)
      setToast({
        type: 'error',
        message: 'Não foi possível adicionar o evento.'
      })
      setTimeout(() => setToast(null), 3000)
    }
  }

  const handleDeleteEvent = async (id: string) => {
    try {
      await eventService.deleteEvent(id)
      setEvents((prev) => prev.filter(e => e.id !== id))
      
      // Trigger delete toast
      setToast({
        type: 'delete',
        message: 'Atividade removida do cronograma com sucesso.'
      })
      setTimeout(() => setToast(null), 3000)
    } catch (e) {
      console.error('Failed to delete event:', e)
      setToast({
        type: 'error',
        message: 'Não foi possível eliminar o evento.'
      })
      setTimeout(() => setToast(null), 3000)
    }
  }

  // Date utilities for custom Calendar
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDayDate = new Date(year, month, 1)
    let startDay = firstDayDate.getDay()
    // Convert Sunday = 0 to 7, then translate to 0-indexed Monday-first (0 = Monday, ..., 6 = Sunday)
    startDay = startDay === 0 ? 6 : startDay - 1
    
    const totalDays = new Date(year, month + 1, 0).getDate()
    const days: (Date | null)[] = []
    
    for (let i = 0; i < startDay; i++) {
      days.push(null)
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i))
    }
    return days
  }

  const getDaysInWeek = (date: Date) => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday (0)
    const monday = new Date(d.setDate(diff))
    
    const weekDays: Date[] = []
    for (let i = 0; i < 7; i++) {
      const current = new Date(monday)
      current.setDate(monday.getDate() + i)
      weekDays.push(current)
    }
    return weekDays
  }

  const isSameDay = (date1: Date | string | null, date2: Date | null) => {
    if (!date1 || !date2) return false
    const d1 = new Date(date1)
    const d2 = new Date(date2)
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    )
  }

  const getEventsForDay = (day: Date | null) => {
    if (!day) return []
    return events.filter(e => isSameDay(e.start_time, day))
  }

  const getMonthName = (monthIndex: number) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    return months[monthIndex]
  }

  const getCalendarTitle = () => {
    if (calendarViewMode === 'month') {
      return `${getMonthName(currentDate.getMonth())} ${currentDate.getFullYear()}`
    } else if (calendarViewMode === 'week') {
      const days = getDaysInWeek(currentDate)
      const start = days[0]
      const end = days[6]
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()} - ${end.getDate()} de ${getMonthName(start.getMonth())} ${start.getFullYear()}`
      }
      return `${start.getDate()} de ${getMonthName(start.getMonth())} - ${end.getDate()} de ${getMonthName(end.getMonth())} ${start.getFullYear()}`
    } else {
      return `${currentDate.getDate()} de ${getMonthName(currentDate.getMonth())} de ${currentDate.getFullYear()}`
    }
  }

  const handlePrevDate = () => {
    const d = new Date(currentDate)
    if (calendarViewMode === 'month') {
      d.setMonth(d.getMonth() - 1)
    } else if (calendarViewMode === 'week') {
      d.setDate(d.getDate() - 7)
    } else {
      d.setDate(d.getDate() - 1)
    }
    setCurrentDate(d)
  }

  const handleNextDate = () => {
    const d = new Date(currentDate)
    if (calendarViewMode === 'month') {
      d.setMonth(d.getMonth() + 1)
    } else if (calendarViewMode === 'week') {
      d.setDate(d.getDate() + 7)
    } else {
      d.setDate(d.getDate() + 1)
    }
    setCurrentDate(d)
  }

  const handleTodayDate = () => {
    setCurrentDate(new Date())
  }

  return (
    <div className="space-y-8 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Calendário do ENEI</h1>
          <p className="text-text-secondary text-sm mt-1">
            Planeamento de atividades, sessões e workshops em tempo real.
          </p>
        </div>
        
        {/* Add Event Button */}
        <div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 bg-brand-primary text-background font-medium rounded-md px-3.5 py-2 text-sm hover:opacity-90 transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>Novo Evento</span>
          </button>
        </div>
      </div>

      {/* Main Calendar Section */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-24 border border-border-custom rounded-lg bg-secondary-bg/20">
            <Loader2 className="animate-spin text-text-secondary mb-3" size={28} strokeWidth={1.5} />
            <span className="text-xs text-text-secondary font-medium">A carregar calendário...</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Calendar Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-border-custom bg-secondary-bg p-3.5 rounded-lg">
              {/* Left: Date Nav */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevDate}
                  className="border border-border-custom p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-background transition-colors cursor-pointer"
                  title="Anterior"
                >
                  <ChevronLeft size={16} strokeWidth={1.5} />
                </button>
                <button
                  onClick={handleTodayDate}
                  className="border border-border-custom px-3 py-1.5 rounded-md text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-background transition-colors cursor-pointer"
                >
                  Hoje
                </button>
                <button
                  onClick={handleNextDate}
                  className="border border-border-custom p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-background transition-colors cursor-pointer"
                  title="Seguinte"
                >
                  <ChevronRight size={16} strokeWidth={1.5} />
                </button>
                
                <span className="text-xs font-semibold text-text-primary ml-2">
                  {getCalendarTitle()}
                </span>
              </div>

              {/* Right: View mode selector */}
              <div className="flex border border-border-custom rounded-md overflow-hidden bg-background">
                {(['day', 'week', 'month'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setCalendarViewMode(mode)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                      calendarViewMode === mode
                        ? 'bg-brand-primary text-background'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {mode === 'day' ? 'Dia' : mode === 'week' ? 'Semana' : 'Mês'}
                  </button>
                ))}
              </div>
            </div>

            {/* View renders */}
            {calendarViewMode === 'month' && (
              <div className="border border-border-custom bg-secondary-bg/10 rounded-lg p-5 overflow-x-auto">
                <div className="min-w-[700px]">
                  {/* Week Headers */}
                  <div className="grid grid-cols-7 gap-2.5 mb-3 text-center text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    <div>Seg</div>
                    <div>Ter</div>
                    <div>Qua</div>
                    <div>Qui</div>
                    <div>Sex</div>
                    <div>Sáb</div>
                    <div>Dom</div>
                  </div>
                  
                  {/* Days Grid */}
                  <div className="grid grid-cols-7 gap-2.5">
                    {getDaysInMonth(currentDate).map((day, idx) => {
                      if (!day) {
                        return <div key={`empty-${idx}`} className="min-h-[100px] border border-transparent" />
                      }
                      
                      const dayEvents = getEventsForDay(day)
                      const isToday = isSameDay(day, new Date())
                      const isSelected = isSameDay(day, currentDate)
                      
                      return (
                        <div
                          key={day.toISOString()}
                          onClick={() => {
                            setCurrentDate(day)
                            setCalendarViewMode('day')
                          }}
                          className={`min-h-[100px] border p-2 rounded-md hover:bg-background/80 transition-all cursor-pointer flex flex-col justify-between ${
                            isToday 
                              ? 'border-brand-primary bg-brand-primary/5' 
                              : isSelected
                                ? 'border-text-primary bg-secondary-bg/25'
                                : 'border-border-custom bg-secondary-bg/10'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span className={`text-xs font-bold ${isToday ? 'text-brand-primary' : 'text-text-primary'}`}>
                              {day.getDate()}
                            </span>
                            {dayEvents.length > 0 && (
                              <span className="text-[10px] bg-brand-primary/10 text-text-primary px-1.5 py-0.5 rounded-full font-bold">
                                {dayEvents.length}
                              </span>
                            )}
                          </div>
                          
                          <div className="space-y-1 mt-2.5 flex-1 overflow-y-auto max-h-[60px] scrollbar-none text-left">
                            {dayEvents.map(event => (
                              <div
                                key={event.id}
                                className="text-[9px] truncate bg-brand-primary/5 border border-brand-primary/10 text-text-primary px-1.5 py-0.5 rounded-sm font-semibold"
                                title={`${new Date(event.start_time).toLocaleTimeString('pt-PT', {hour:'2-digit', minute:'2-digit'})} - ${event.title}`}
                              >
                                {event.title}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {calendarViewMode === 'week' && (
              <div className="border border-border-custom bg-secondary-bg/10 rounded-lg p-5 overflow-x-auto">
                <div className="min-w-[850px] flex gap-4">
                  {getDaysInWeek(currentDate).map((day, idx) => {
                    const dayEvents = getEventsForDay(day)
                    const isToday = isSameDay(day, new Date())
                    const weekdayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
                    
                    return (
                      <div key={day.toISOString()} className="flex flex-col flex-1 min-w-[110px]">
                        {/* Column Header */}
                        <div className={`p-2.5 border-b text-center rounded-t-md ${
                          isToday 
                            ? 'border-brand-primary bg-brand-primary/5 text-text-primary' 
                            : 'border-border-custom bg-secondary-bg/30 text-text-secondary'
                        }`}>
                          <span className="text-[10px] uppercase font-bold tracking-wider block">{weekdayNames[idx].slice(0, 3)}</span>
                          <span className="text-lg font-bold block mt-0.5">{day.getDate()}</span>
                        </div>
                        
                        {/* Column stack events */}
                        <div className="flex-1 border-x border-b border-border-custom/50 bg-secondary-bg/5 p-2 rounded-b-md space-y-2 min-h-[300px] max-h-[500px] overflow-y-auto scrollbar-thin">
                          {dayEvents.length > 0 ? (
                            dayEvents.map(event => (
                              <div 
                                key={event.id} 
                                onClick={() => {
                                  setCurrentDate(day)
                                  setCalendarViewMode('day')
                                }}
                                className="p-2.5 border border-border-custom bg-background rounded-md text-xs hover:border-brand-primary transition-all cursor-pointer text-left"
                              >
                                <span className="text-[9px] font-mono text-text-secondary block mb-1">
                                  {new Date(event.start_time).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <p className="font-semibold text-text-primary line-clamp-2 leading-tight">{event.title}</p>
                                {event.location && (
                                  <p className="text-[9px] text-text-secondary truncate mt-1.5">📍 {event.location}</p>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="h-full flex items-center justify-center text-center p-4 opacity-40">
                              <span className="text-xs text-text-secondary italic">Sem eventos</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {calendarViewMode === 'day' && (
              <div className="border border-border-custom bg-secondary-bg/10 rounded-lg p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-border-custom/50 pb-3">
                  <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                    Agenda para {currentDate.toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>
                  <button 
                    onClick={() => setCalendarViewMode('month')}
                    className="text-xs text-text-secondary hover:text-text-primary cursor-pointer font-medium"
                  >
                    Voltar para Mês
                  </button>
                </div>
                
                <div className="space-y-4">
                  {getEventsForDay(currentDate).length > 0 ? (
                    <div className="relative border-l border-border-custom pl-6 ml-3 space-y-6 py-2">
                      {getEventsForDay(currentDate)
                        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                        .map(event => {
                          const startHour = new Date(event.start_time).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
                          const endHour = new Date(event.end_time).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
                          
                          return (
                            <div key={event.id} className="relative group flex flex-col md:flex-row md:items-start gap-4 text-left">
                              {/* Time block */}
                              <div className="md:w-20 shrink-0 text-xs font-mono text-text-secondary pt-1">
                                <span className="font-semibold block">{startHour}</span>
                                <span className="text-[10px] opacity-75 block">{endHour}</span>
                              </div>
                              
                              {/* Line bullet dot */}
                              <span className="absolute left-[-31px] top-2 h-2.5 w-2.5 rounded-full border-2 border-border-custom bg-background transition-colors group-hover:border-brand-primary" />
                              
                              {/* EventCard container */}
                              <div className="flex-1 min-w-0">
                                <EventCard event={event} onDelete={handleDeleteEvent} currentUser={currentUser} />
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-14 text-center">
                      <CalendarDays size={32} className="text-text-secondary mb-3 opacity-40" />
                      <span className="text-sm font-medium text-text-primary mb-1">Nenhuma atividade hoje</span>
                      <p className="text-xs text-text-secondary max-w-xs">
                        Não existem eventos agendados para este dia. Adiciona um novo clicando em &quot;Novo Evento&quot; no canto superior.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Creation Modal */}
      <EventFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddEvent={handleAddEvent}
      />

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
              <Trash2 size={14} strokeWidth={1.5} />
            ) : (
              <Check size={14} strokeWidth={2.5} />
            )}
          </div>
          <div className="space-y-0.5">
            <span className="font-bold text-text-primary text-xs block">
              {toast.type === 'success' ? 'Sucesso' : toast.type === 'delete' ? 'Eliminado' : 'Erro'}
            </span>
            <p className="text-text-secondary text-[11px] leading-relaxed">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  )
}
