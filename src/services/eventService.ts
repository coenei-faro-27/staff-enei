import { createClient } from '@/utils/supabase/client'

export interface EventItem {
  id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  location: string | null
  department: string | null
  user_id: string | null
  assigned_to: string | null
  created_at: string
}

interface DbEventItem {
  id: string
  title: string
  description: string | null
  start_date: string
  end_date: string
  location: string | null
  department: string | null
  user_id: string | null
  assigned_to: string | null
  created_at: string
}

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && !url.includes('your-project') && !key.includes('your-anon-key')
}

// LocalStorage helpers
const getLocalEvents = (): EventItem[] => {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem('enei_events')
  if (!data) {
    localStorage.setItem('enei_events', JSON.stringify([]))
    return []
  }
  return JSON.parse(data)
}

const saveLocalEvents = (events: EventItem[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('enei_events', JSON.stringify(events))
  }
}

export const eventService = {
  isLocalMode(): boolean {
    return !isSupabaseConfigured()
  },

  async getEvents(): Promise<EventItem[]> {
    const localEvents = getLocalEvents()

    if (!isSupabaseConfigured()) {
      return localEvents
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: true })

      if (error) throw error
      
      // Map database columns 'start_date' / 'end_date' to frontend properties 'start_time' / 'end_time'
      const remoteEvents = (data || []).map((e: DbEventItem) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        start_time: e.start_date,
        end_time: e.end_date,
        location: e.location,
        department: e.department,
        user_id: e.user_id,
        assigned_to: e.assigned_to,
        created_at: e.created_at
      }))

      // Merge remote events with local storage events (avoiding duplicates)
      const merged = [...remoteEvents]
      localEvents.forEach(localEvent => {
        const exists = merged.some(m => m.id === localEvent.id || (m.title === localEvent.title && m.start_time === localEvent.start_time))
        if (!exists) {
          merged.push(localEvent)
        }
      })

      // Sort chronologically (earliest first)
      return merged.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    } catch (e) {
      console.warn('Failed to fetch events from Supabase, falling back to LocalStorage:', e)
      return localEvents
    }
  },

  async createEvent(
    title: string, 
    description: string, 
    start_time: string, 
    end_time: string, 
    location: string,
    department?: string | null,
    assignedTo?: string | null
  ): Promise<EventItem> {
    const isConfigured = isSupabaseConfigured()
    const newEvent: EventItem = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      title,
      description: description || null,
      start_time,
      end_time,
      location: location || null,
      department: department || null,
      user_id: null,
      assigned_to: assignedTo || null,
      created_at: new Date().toISOString()
    }

    if (!isConfigured) {
      const events = getLocalEvents()
      const updated = [...events, newEvent].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )
      saveLocalEvents(updated)
      return newEvent
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('events')
        .insert([{ 
          title, 
          description, 
          start_date: start_time, 
          end_date: end_time, 
          location,
          department: department || null,
          assigned_to: assignedTo || null
        }])
        .select()
        .single()

      if (error) throw error
      
      return {
        id: data.id,
        title: data.title,
        description: data.description,
        start_time: data.start_date || data.start_time,
        end_time: data.end_date || data.end_time,
        location: data.location,
        department: data.department,
        user_id: data.user_id,
        assigned_to: data.assigned_to,
        created_at: data.created_at
      }
    } catch (e) {
      console.warn('Failed to create event in Supabase, saving to LocalStorage:', e)
      const events = getLocalEvents()
      const updated = [...events, newEvent].sort(
        (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )
      saveLocalEvents(updated)
      return newEvent
    }
  },

  async deleteEvent(id: string): Promise<void> {
    const isConfigured = isSupabaseConfigured()

    if (!isConfigured) {
      const events = getLocalEvents()
      const updated = events.filter(e => e.id !== id)
      saveLocalEvents(updated)
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (e) {
      console.warn('Failed to delete event from Supabase, deleting from LocalStorage:', e)
      const events = getLocalEvents()
      const updated = events.filter(e => e.id !== id)
      saveLocalEvents(updated)
    }
  }
}
