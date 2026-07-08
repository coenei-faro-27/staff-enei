'use client'

import React from 'react'
import { MapPin, Clock, Trash2, Lock, Landmark } from 'lucide-react'
import { EventItem } from '@/services/eventService'
import { UserProfile } from '@/services/profileService'

interface EventCardProps {
  event: EventItem
  onDelete: (id: string) => void
  showDelete?: boolean
  currentUser?: UserProfile | null
}

export default function EventCard({ event, onDelete, showDelete = true, currentUser }: EventCardProps) {
  const roleLower = currentUser?.role?.toLowerCase()
  const isAdmin = roleLower === 'admin'
  const isMesa = currentUser?.department === 'Mesa'
  const isDiretorOrCo = roleLower === 'diretor' || roleLower === 'co-diretor'
  
  // Can delete if:
  // 1. Admin
  // 2. Creator of the event
  // 3. Assigned to the event
  // 4. Mesa (for all public departmental events)
  // 5. Director/Co-director of the event's department
  const canDelete = !currentUser || 
    isAdmin ||
    (event.user_id === currentUser.id) ||
    (event.assigned_to === currentUser.id) ||
    (isMesa && event.department !== null) ||
    (isDiretorOrCo && event.department === currentUser.department)

  const shouldRenderDelete = showDelete && canDelete

  // Format times
  const formatEventTime = (startStr: string, endStr: string) => {
    try {
      const start = new Date(startStr)
      const end = new Date(endStr)
      
      const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
      const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
      
      const startTime = start.toLocaleTimeString('pt-PT', timeOptions)
      const endTime = end.toLocaleTimeString('pt-PT', timeOptions)
      const startDate = start.toLocaleDateString('pt-PT', dateOptions)
      const endDate = end.toLocaleDateString('pt-PT', dateOptions)
      
      if (startDate === endDate) {
        return `${startDate} • ${startTime} - ${endTime}`
      }
      return `${startDate} às ${startTime} - ${endDate} às ${endTime}`
    } catch {
      return 'Horário Indefinido'
    }
  }

  // Get current status
  const getEventStatus = (startStr: string, endStr: string) => {
    const now = new Date().getTime()
    const start = new Date(startStr).getTime()
    const end = new Date(endStr).getTime()
    
    if (now >= start && now <= end) {
      return 'ongoing'
    }
    if (now > end) {
      return 'past'
    }
    return 'future'
  }

  const status = getEventStatus(event.start_time, event.end_time)

  // Define styles for each department badge
  const getBadgeStyle = (dept: string | null) => {
    if (!dept) {
      return 'border-border-custom/50 text-text-secondary bg-transparent'
    }
    
    switch (dept) {
      case 'Mesa':
        return 'border-indigo-500/30 text-indigo-500 bg-indigo-500/5 dark:text-indigo-400'
      case 'Logística':
        return 'border-orange-500/30 text-orange-500 bg-orange-500/5 dark:text-orange-400'
      case 'Marketing':
        return 'border-pink-500/30 text-pink-500 bg-pink-500/5 dark:text-pink-400'
      case 'Atividades':
        return 'border-emerald-500/30 text-emerald-500 bg-emerald-500/5 dark:text-emerald-400'
      case 'Tecnologia':
        return 'border-blue-500/30 text-blue-500 bg-blue-500/5 dark:text-blue-400'
      case 'Comercial':
        return 'border-amber-500/30 text-amber-500 bg-amber-500/5 dark:text-amber-400'
      default:
        return 'border-border-custom text-text-secondary'
    }
  }

  return (
    <div 
      className={`group relative flex flex-col justify-between border border-border-custom bg-background p-5 rounded-lg transition-all duration-300 hover:border-text-secondary/30 ${
        status === 'past' ? 'opacity-60 bg-secondary-bg/30' : ''
      }`}
    >
      <div className="space-y-3">
        {/* Status Badge & Actions */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            {status === 'ongoing' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border border-emerald-500/30 text-emerald-600 bg-emerald-500/5 dark:text-emerald-400 dark:bg-emerald-500/10">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>A Decorrer</span>
              </span>
            ) : status === 'past' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-border-custom text-text-secondary bg-transparent">
                <span>Terminado</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border border-blue-500/20 text-blue-600 bg-blue-500/5 dark:text-blue-400 dark:bg-blue-500/10">
                <span>Brevemente</span>
              </span>
            )}

            {/* Department / Private Badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 select-none ${getBadgeStyle(event.department || null)}`}>
              {event.department ? (
                <>
                  <Landmark size={8} />
                  <span>{event.department}</span>
                </>
              ) : (
                <>
                  <Lock size={8} />
                  <span>Privado</span>
                </>
              )}
            </span>
          </div>

          {/* Delete Button (visible on hover) */}
          {shouldRenderDelete && (
            <button
              onClick={() => onDelete(event.id)}
              aria-label="Eliminar evento"
              className="md:opacity-0 group-hover:opacity-100 border border-red-500/40 text-red-500 hover:text-white bg-transparent hover:bg-red-500 dark:hover:bg-red-950/40 p-1.5 rounded-md transition-all cursor-pointer"
            >
              <Trash2 size={13} strokeWidth={1.5} />
            </button>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-text-primary text-base leading-tight tracking-tight">
          {event.title}
        </h3>

        {/* Details Row (Time / Location) */}
        <div className="space-y-1.5 text-xs text-text-secondary">
          <div className="flex items-center gap-2">
            <Clock size={13} strokeWidth={1.5} className="text-text-secondary" />
            <span>{formatEventTime(event.start_time, event.end_time)}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin size={13} strokeWidth={1.5} className="text-text-secondary" />
              <span>{event.location}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-xs text-text-secondary leading-relaxed line-clamp-3 pt-1 border-t border-border-custom/50">
            {event.description}
          </p>
        )}
      </div>
    </div>
  )
}
