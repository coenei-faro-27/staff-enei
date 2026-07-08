import { createClient } from '@/utils/supabase/client'

export interface Task {
  id: string
  title: string
  completed: boolean
  department: string | null // null means individual/private
  created_at: string
  user_id?: string | null
  assigned_to?: string | null
}

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && !url.includes('your-project') && !key.includes('your-anon-key')
}

// LocalStorage helpers
const getLocalTasks = (): Task[] => {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem('enei_tasks')
  return data ? JSON.parse(data) : []
}

const saveLocalTasks = (tasks: Task[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('enei_tasks', JSON.stringify(tasks))
  }
}

export const taskService = {
  isLocalMode(): boolean {
    return !isSupabaseConfigured()
  },

  async getTasks(): Promise<Task[]> {
    if (!isSupabaseConfigured()) {
      return getLocalTasks()
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (e) {
      console.warn('Failed to fetch from Supabase, falling back to LocalStorage:', e)
      return getLocalTasks()
    }
  },

  async createTask(title: string, department: string | null, assignedTo?: string | null): Promise<Task> {
    const isConfigured = isSupabaseConfigured()
    const newTask: Task = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      title,
      completed: false,
      department,
      created_at: new Date().toISOString(),
      assigned_to: assignedTo || null
    }

    if (!isConfigured) {
      const tasks = getLocalTasks()
      const updated = [newTask, ...tasks]
      saveLocalTasks(updated)
      return newTask
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tasks')
        .insert([{ title, department, assigned_to: assignedTo || null }])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (e) {
      console.warn('Failed to create in Supabase, saving to LocalStorage:', e)
      const tasks = getLocalTasks()
      const updated = [newTask, ...tasks]
      saveLocalTasks(updated)
      return newTask
    }
  },

  async toggleTask(id: string, completed: boolean): Promise<void> {
    const isConfigured = isSupabaseConfigured()

    if (!isConfigured) {
      const tasks = getLocalTasks()
      const updated = tasks.map(t => t.id === id ? { ...t, completed } : t)
      saveLocalTasks(updated)
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tasks')
        .update({ completed })
        .eq('id', id)

      if (error) throw error
    } catch (e) {
      console.warn('Failed to update in Supabase, updating LocalStorage:', e)
      const tasks = getLocalTasks()
      const updated = tasks.map(t => t.id === id ? { ...t, completed } : t)
      saveLocalTasks(updated)
    }
  },

  async deleteTask(id: string): Promise<void> {
    const isConfigured = isSupabaseConfigured()

    if (!isConfigured) {
      const tasks = getLocalTasks()
      const updated = tasks.filter(t => t.id !== id)
      saveLocalTasks(updated)
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (e) {
      console.warn('Failed to delete from Supabase, deleting from LocalStorage:', e)
      const tasks = getLocalTasks()
      const updated = tasks.filter(t => t.id !== id)
      saveLocalTasks(updated)
    }
  }
}
