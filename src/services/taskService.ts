import { createClient } from '@/utils/supabase/client'
import { UserProfile } from './profileService'

export interface TaskAttachment {
  id: string
  name: string
  size: number
  type: 'image' | 'file'
  storage_path?: string
  url?: string
  created_at: string
}

export interface TaskComment {
  id: string
  user_id: string
  user_name: string
  text: string
  created_at: string
}

export interface TaskAssignedUser {
  id: string
  full_name: string
  avatar_color?: string
}

export interface Task {
  id: string
  title: string
  description?: string | null
  completed: boolean
  department: string | null // null means individual/private
  created_at: string
  user_id?: string | null
  assigned_to?: string | null // UUID FK to profiles(id)
  assigned_user?: TaskAssignedUser | null
  attachments?: TaskAttachment[]
  comments?: TaskComment[]
}

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && !url.includes('your-project') && !key.includes('your-anon-key')
}

// Session cache for uploaded files in local mode
const localAttachmentCache = new Map<string, string>()

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
        .select(`
          *,
          assigned_user:profiles!tasks_assigned_to_fkey(id, full_name, avatar_color)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      return (data || []).map((t) => ({
        ...t,
        description: t.description || '',
        attachments: t.attachments || [],
        comments: t.comments || [],
        assigned_user: Array.isArray(t.assigned_user) ? t.assigned_user[0] || null : t.assigned_user || null
      }))
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
      description: '',
      completed: false,
      department,
      created_at: new Date().toISOString(),
      assigned_to: assignedTo || null,
      assigned_user: null,
      attachments: [],
      comments: []
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
        .insert([{ 
          title, 
          department, 
          assigned_to: assignedTo || null,
          description: '',
          attachments: [],
          comments: []
        }])
        .select(`
          *,
          assigned_user:profiles!tasks_assigned_to_fkey(id, full_name, avatar_color)
        `)
        .single()

      if (error) throw error
      return {
        ...data,
        assigned_user: Array.isArray(data.assigned_user) ? data.assigned_user[0] || null : data.assigned_user || null
      }
    } catch (e) {
      console.warn('Failed to create in Supabase, saving to LocalStorage:', e)
      const tasks = getLocalTasks()
      const updated = [newTask, ...tasks]
      saveLocalTasks(updated)
      return newTask
    }
  },

  async claimTask(taskId: string, user: UserProfile | null): Promise<Task> {
    const isConfigured = isSupabaseConfigured()
    const newAssignedTo = user ? user.id : null
    const newAssignedUser = user ? { id: user.id, full_name: user.full_name, avatar_color: user.avatar_color } : null

    const tasks = getLocalTasks()
    const existing = tasks.find(t => t.id === taskId)
    const updatedTask: Task = existing
      ? { ...existing, assigned_to: newAssignedTo, assigned_user: newAssignedUser }
      : {
          id: taskId,
          title: '',
          completed: false,
          department: null,
          created_at: new Date().toISOString(),
          assigned_to: newAssignedTo,
          assigned_user: newAssignedUser,
          attachments: [],
          comments: []
        }

    const updatedTasks = tasks.map(t => t.id === taskId ? updatedTask : t)
    saveLocalTasks(updatedTasks)

    if (!isConfigured) {
      return updatedTask
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tasks')
        .update({ assigned_to: newAssignedTo })
        .eq('id', taskId)
        .select(`
          *,
          assigned_user:profiles!tasks_assigned_to_fkey(id, full_name, avatar_color)
        `)
        .single()

      if (error) throw error
      return {
        ...data,
        assigned_user: Array.isArray(data.assigned_user) ? data.assigned_user[0] || null : data.assigned_user || null
      }
    } catch (e) {
      console.warn('Failed to claim task in Supabase, updated local cache:', e)
      return updatedTask
    }
  },

  async updateTaskDescription(taskId: string, description: string): Promise<void> {
    const isConfigured = isSupabaseConfigured()
    const tasks = getLocalTasks()
    const updated = tasks.map(t => t.id === taskId ? { ...t, description } : t)
    saveLocalTasks(updated)

    if (!isConfigured) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tasks')
        .update({ description })
        .eq('id', taskId)

      if (error) throw error
    } catch (e) {
      console.warn('Failed to update description in Supabase:', e)
    }
  },

  async addAttachment(taskId: string, file: File): Promise<TaskAttachment> {
    const isConfigured = isSupabaseConfigured()
    const attachmentId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)
    const isImage = file.type.startsWith('image/')
    const storagePath = `task-attachments/${taskId}/${attachmentId}_${file.name}`
    
    // Preview URL for current session
    let objectUrl = ''
    try {
      objectUrl = URL.createObjectURL(file)
      localAttachmentCache.set(storagePath, objectUrl)
    } catch {}

    const newAttachment: TaskAttachment = {
      id: attachmentId,
      name: file.name,
      size: file.size,
      type: isImage ? 'image' : 'file',
      storage_path: storagePath,
      url: objectUrl,
      created_at: new Date().toISOString()
    }

    // Update LocalStorage
    const tasks = getLocalTasks()
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      const updatedAttachments = [...(task.attachments || []), newAttachment]
      const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, attachments: updatedAttachments } : t)
      saveLocalTasks(updatedTasks)
    }

    if (!isConfigured) {
      return newAttachment
    }

    try {
      const supabase = createClient()
      
      // Upload file to Supabase Storage bucket 'documents'
      const { error: uploadError } = await supabase
        .storage
        .from('documents')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Get public URL or signed URL metadata path
      const { data: publicUrlData } = supabase
        .storage
        .from('documents')
        .getPublicUrl(storagePath)

      const attachmentWithUrl: TaskAttachment = {
        ...newAttachment,
        url: publicUrlData?.publicUrl || objectUrl
      }

      // Fetch existing attachments to append safely
      const { data: currentTask } = await supabase
        .from('tasks')
        .select('attachments')
        .eq('id', taskId)
        .single()

      const existingAttachments: TaskAttachment[] = currentTask?.attachments || []
      const finalAttachments = [...existingAttachments, attachmentWithUrl]

      const { error: dbError } = await supabase
        .from('tasks')
        .update({ attachments: finalAttachments })
        .eq('id', taskId)

      if (dbError) throw dbError

      return attachmentWithUrl
    } catch (e) {
      console.warn('Failed to upload attachment to Supabase Storage, kept in local session:', e)
      return newAttachment
    }
  },

  async removeAttachment(taskId: string, attachmentId: string, storagePath?: string): Promise<void> {
    const isConfigured = isSupabaseConfigured()

    if (storagePath) {
      localAttachmentCache.delete(storagePath)
    }

    // Update LocalStorage
    const tasks = getLocalTasks()
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      const updatedAttachments = (task.attachments || []).filter(a => a.id !== attachmentId)
      const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, attachments: updatedAttachments } : t)
      saveLocalTasks(updatedTasks)
    }

    if (!isConfigured) return

    try {
      const supabase = createClient()
      
      if (storagePath) {
        await supabase
          .storage
          .from('documents')
          .remove([storagePath])
          .catch(() => {})
      }

      const { data: currentTask } = await supabase
        .from('tasks')
        .select('attachments')
        .eq('id', taskId)
        .single()

      const existingAttachments: TaskAttachment[] = currentTask?.attachments || []
      const finalAttachments = existingAttachments.filter(a => a.id !== attachmentId)

      const { error } = await supabase
        .from('tasks')
        .update({ attachments: finalAttachments })
        .eq('id', taskId)

      if (error) throw error
    } catch (e) {
      console.warn('Failed to remove attachment from Supabase:', e)
    }
  },

  async addComment(taskId: string, user: UserProfile, text: string): Promise<TaskComment> {
    const isConfigured = isSupabaseConfigured()
    const newComment: TaskComment = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      user_id: user.id,
      user_name: user.full_name,
      text,
      created_at: new Date().toISOString()
    }

    // Update LocalStorage
    const tasks = getLocalTasks()
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      const updatedComments = [...(task.comments || []), newComment]
      const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, comments: updatedComments } : t)
      saveLocalTasks(updatedTasks)
    }

    if (!isConfigured) return newComment

    try {
      const supabase = createClient()
      const { data: currentTask } = await supabase
        .from('tasks')
        .select('comments')
        .eq('id', taskId)
        .single()

      const existingComments: TaskComment[] = currentTask?.comments || []
      const finalComments = [...existingComments, newComment]

      const { error } = await supabase
        .from('tasks')
        .update({ comments: finalComments })
        .eq('id', taskId)

      if (error) throw error
      return newComment
    } catch (e) {
      console.warn('Failed to add comment to Supabase:', e)
      return newComment
    }
  },

  async toggleTask(id: string, completed: boolean): Promise<void> {
    const isConfigured = isSupabaseConfigured()

    const tasks = getLocalTasks()
    const updated = tasks.map(t => t.id === id ? { ...t, completed } : t)
    saveLocalTasks(updated)

    if (!isConfigured) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tasks')
        .update({ completed })
        .eq('id', id)

      if (error) throw error
    } catch (e) {
      console.warn('Failed to update in Supabase, updating LocalStorage:', e)
    }
  },

  async deleteTask(id: string): Promise<void> {
    const isConfigured = isSupabaseConfigured()

    const tasks = getLocalTasks()
    const updated = tasks.filter(t => t.id !== id)
    saveLocalTasks(updated)

    if (!isConfigured) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (e) {
      console.warn('Failed to delete from Supabase, deleting from LocalStorage:', e)
    }
  }
}
