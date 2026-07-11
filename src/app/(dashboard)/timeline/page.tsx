'use client'

import React, { useState, useEffect } from 'react'
import { 
  History,
  Loader2
} from 'lucide-react'
import { eventService, EventItem } from '@/services/eventService'
import EventCard from '@/components/EventCard'
import { profileService, UserProfile } from '@/services/profileService'

export default function TimelinePage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)

  // Load events and profile
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

  // Sort events chronologically (earliest first)
  const timelineEvents = [...events].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  )

  const handleDeleteEvent = async (id: string) => {
    try {
      await eventService.deleteEvent(id)
      setEvents((prev) => prev.filter(e => e.id !== id))
    } catch (e) {
      console.error('Failed to delete event:', e)
    }
  }

  return (
    <div className="space-y-8 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Timeline do ENEI</h1>
          <p className="text-text-secondary text-sm mt-1">
            Fio condutor do evento. Visualização sequencial de todas as atividades do início ao fim.
          </p>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-24 border border-border-custom rounded-lg bg-secondary-bg/20">
            <Loader2 className="animate-spin text-text-secondary mb-3" size={28} strokeWidth={1.5} />
            <span className="text-xs text-text-secondary font-medium">A carregar cronograma...</span>
          </div>
        ) : timelineEvents.length > 0 ? (
          <div className="relative w-full overflow-x-auto py-8 px-4 border border-border-custom bg-secondary-bg/15 rounded-lg scrollbar-thin">
            <div className="relative flex gap-8 z-10 min-w-max px-4">
              {timelineEvents.map((event, index) => {
                const startDate = new Date(event.start_time)
                const timeStr = startDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
                const dateStr = startDate.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
                
                return (
                  <div key={event.id} className="w-[280px] flex flex-col items-center snap-center">
                    {/* Date and time label above the line */}
                    <div className="mb-3 text-center">
                      <span className="text-xs font-bold text-text-primary">{dateStr}</span>
                      <span className="text-[10px] text-text-secondary block font-mono font-medium">{timeStr}</span>
                    </div>
                    
                    {/* Pure CSS Connecting Line & Dot */}
                    <div className="relative w-full flex items-center justify-center my-3 h-6">
                      {/* Horizontal Line Connector */}
                      <div className={`absolute h-[2px] bg-border-custom top-1/2 -translate-y-1/2 z-0 ${
                        index === 0 ? 'left-1/2 right-0' : 
                        index === timelineEvents.length - 1 ? 'left-0 right-1/2' : 
                        'left-0 right-0'
                      }`} />
                      
                      {/* Circle dot node */}
                      <div className="relative h-6 w-6 rounded-full border-2 border-border-custom bg-background flex items-center justify-center z-10 transition-colors hover:border-brand-primary">
                        <span className="h-2.5 w-2.5 rounded-full bg-brand-primary" />
                      </div>
                    </div>
                    
                    {/* Event Card */}
                    <div className="w-full text-left">
                      <EventCard event={event} onDelete={handleDeleteEvent} currentUser={currentUser} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-20 border border-border-custom rounded-lg bg-secondary-bg/20 text-center">
            <History size={32} className="text-text-secondary mb-3 opacity-40" />
            <span className="text-sm font-medium text-text-primary mb-1">Nenhum evento registado</span>
            <p className="text-xs text-text-secondary max-w-sm">
              Não existem atividades ou sessões agendadas no cronograma global deste evento.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
