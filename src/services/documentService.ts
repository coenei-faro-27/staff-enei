import { createClient } from '@/utils/supabase/client'

export interface DocumentItem {
  name: string
  id: string
  size: number // in bytes
  updated_at: string
  created_at: string
  department: string // 'Geral', 'Conteúdos', 'Logística', etc. 'Privado' for private
  url?: string
}

const DEPARTMENTS = ['Mesa', 'Logística', 'Marketing', 'Atividades', 'Tecnologia', 'Comercial', 'Privado']

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && !url.includes('your-project') && !key.includes('your-anon-key')
}

// LocalStorage helpers
const getLocalDocs = (): DocumentItem[] => {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem('enei_documents')
  if (!data) {
    localStorage.setItem('enei_documents', JSON.stringify([]))
    return []
  }
  return JSON.parse(data)
}

const saveLocalDocs = (docs: DocumentItem[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('enei_documents', JSON.stringify(docs))
  }
}

// Temporary session cache for local files uploaded in the current session (to enable real previews)
const localFileCache = new Map<string, string>()

export const documentService = {
  isLocalMode(): boolean {
    return !isSupabaseConfigured()
  },

  async getDocuments(): Promise<DocumentItem[]> {
    const localDocs = getLocalDocs()

    if (!isSupabaseConfigured()) {
      return localDocs
    }

    try {
      const supabase = createClient()
      const allFiles: DocumentItem[] = []

      // In Supabase Storage, list files directory-by-directory
      for (const dept of DEPARTMENTS) {
        const { data, error } = await supabase
          .storage
          .from('documents')
          .list(dept, {
            limit: 100,
            sortBy: { column: 'name', order: 'asc' }
          })

        if (error) {
          // If listing fails (e.g., bucket not found or no permissions), throw to trigger local fallback
          throw error
        }

        if (data) {
          data.forEach(file => {
            // Filter out placeholder files
            if (file.name !== '.emptyFolderPlaceholder' && file.name !== '.keep') {
              allFiles.push({
                id: file.id || file.name,
                name: file.name,
                size: file.metadata?.size || 0,
                created_at: file.created_at || new Date().toISOString(),
                updated_at: file.updated_at || new Date().toISOString(),
                department: dept
              })
            }
          })
        }
      }

      // Merge Supabase files with any files that are only in LocalStorage (cache/failed uploads)
      const merged = [...allFiles]
      localDocs.forEach(localDoc => {
        const exists = merged.some(m => m.name === localDoc.name && m.department === localDoc.department)
        if (!exists) {
          merged.push(localDoc)
        }
      })

      // Sort files by upload date (newest first)
      return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } catch (e) {
      console.warn('Failed to fetch from Supabase Storage, falling back to LocalStorage:', e)
      return localDocs
    }
  },

  async uploadDocument(file: File, department: string): Promise<DocumentItem> {
    const isConfigured = isSupabaseConfigured()
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)
    
    const newDoc: DocumentItem = {
      id,
      name: file.name,
      size: file.size,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      department
    }

    // Cache the real file object URL for the current session (allows real preview of local uploads)
    const fileKey = `${department}/${file.name}`
    try {
      const objUrl = URL.createObjectURL(file)
      localFileCache.set(fileKey, objUrl)
    } catch {}

    // Always save to LocalStorage cache first for instant reactivity and fallback
    const docs = getLocalDocs()
    const filtered = docs.filter(d => !(d.name === file.name && d.department === department))
    const updated = [newDoc, ...filtered]
    saveLocalDocs(updated)

    if (!isConfigured) {
      return newDoc
    }

    // Upload to Supabase Storage
    try {
      const supabase = createClient()
      const filePath = `${department}/${file.name}`
      
      const { error } = await supabase
        .storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (error) throw error

      // If uploaded successfully, remove from local fallback cache so it lives purely in Supabase
      const freshDocs = getLocalDocs().filter(d => !(d.name === file.name && d.department === department))
      saveLocalDocs(freshDocs)

      return newDoc
    } catch (e) {
      console.warn('Failed to upload to Supabase, document is kept in LocalStorage fallback:', e)
      return newDoc
    }
  },

  async deleteDocument(name: string, department: string): Promise<void> {
    const fileKey = `${department}/${name}`
    localFileCache.delete(fileKey)

    // Always remove from LocalStorage
    const docs = getLocalDocs()
    const updated = docs.filter(d => !(d.name === name && d.department === department))
    saveLocalDocs(updated)

    if (!isSupabaseConfigured()) {
      return
    }

    // Remove from Supabase Storage
    try {
      const supabase = createClient()
      const filePath = `${department}/${name}`
      
      const { error } = await supabase
        .storage
        .from('documents')
        .remove([filePath])

      if (error) throw error
    } catch (e) {
      console.warn('Failed to delete from Supabase:', e)
    }
  },

  async downloadDocument(name: string, department: string, forceDownload = true): Promise<string> {
    const fileKey = `${department}/${name}`
    
    // Check if we have the real file object cached in the current session
    if (localFileCache.has(fileKey)) {
      return localFileCache.get(fileKey)!
    }

    const isConfigured = isSupabaseConfigured()

    if (!isConfigured) {
      const mockData = `Ficheiro Simulado: ${name}\nDepartamento: ${department}\nTamanho: ${name.length} bytes\nData de Criação: ${new Date().toLocaleDateString()}`
      const blob = new Blob([mockData], { type: 'text/plain' })
      return URL.createObjectURL(blob)
    }

    try {
      const supabase = createClient()
      const filePath = `${department}/${name}`
      
      const { data, error } = await supabase
        .storage
        .from('documents')
        .createSignedUrl(filePath, 60, {
          download: forceDownload ? (name || true) : false
        })

      if (error) throw error
      if (!data?.signedUrl) throw new Error('Download URL not generated')
      
      return data.signedUrl
    } catch (e) {
      console.warn('Failed to get download URL from Supabase, returning mock URL:', e)
      const mockData = `Ficheiro Simulado: ${name}\nDepartamento: ${department}`
      const blob = new Blob([mockData], { type: 'text/plain' })
      return URL.createObjectURL(blob)
    }
  }
}
