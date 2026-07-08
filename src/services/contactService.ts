import { createClient } from '@/utils/supabase/client'

export interface ContactEntity {
  id: string
  name: string
  description: string | null
  created_at: string
}

export interface Contact {
  id: string
  entity_id: string
  name: string
  role: string | null
  email: string | null
  phone: string | null
  notes: string | null
  created_at: string
}

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && !url.includes('your-project') && !key.includes('your-anon-key')
}

// Initial mock data for LocalStorage fallback
const getInitialEntities = (): ContactEntity[] => [
  {
    id: 'entity-1',
    name: 'Google Portugal',
    description: 'Patrocinador Gold - Contactos de marketing e TI',
    created_at: new Date().toISOString()
  },
  {
    id: 'entity-2',
    name: 'Red Bull',
    description: 'Parceiro oficial de bebidas energéticas',
    created_at: new Date().toISOString()
  },
  {
    id: 'entity-3',
    name: 'NEEI - Núcleo de Estudantes',
    description: 'Organização co-promotora - Coordenação interna',
    created_at: new Date().toISOString()
  }
]

const getInitialContacts = (): Contact[] => [
  {
    id: 'contact-1',
    entity_id: 'entity-1',
    name: 'Maria Silva',
    role: 'Gestora de Eventos',
    email: 'maria.silva@google.com',
    phone: '912345678',
    notes: 'Contacto principal para ativação da marca no átrio principal.',
    created_at: new Date().toISOString()
  },
  {
    id: 'contact-2',
    entity_id: 'entity-1',
    name: 'João Santos',
    role: 'Engenheiro de Sistemas',
    email: 'joao.santos@google.com',
    phone: '931112222',
    notes: 'Apoio técnico para a infraestrutura do workshop de Cloud.',
    created_at: new Date().toISOString()
  },
  {
    id: 'contact-3',
    entity_id: 'entity-2',
    name: 'Pedro Sousa',
    role: 'Coordenador de Vendas',
    email: 'pedro.sousa@redbull.com',
    phone: '960001111',
    notes: 'Tratar da entrega e montagem dos frigoríficos no Dia 0.',
    created_at: new Date().toISOString()
  },
  {
    id: 'contact-4',
    entity_id: 'entity-3',
    name: 'Ana Costa',
    role: 'Presidente do Núcleo',
    email: 'direcao@neei.org',
    phone: '929998888',
    notes: 'Coordenação geral do staff e relações institucionais.',
    created_at: new Date().toISOString()
  }
]

// LocalStorage helpers
const getLocalEntities = (): ContactEntity[] => {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem('enei_contact_entities')
  if (!data) {
    const initial = getInitialEntities()
    localStorage.setItem('enei_contact_entities', JSON.stringify(initial))
    return initial
  }
  return JSON.parse(data)
}

const saveLocalEntities = (entities: ContactEntity[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('enei_contact_entities', JSON.stringify(entities))
  }
}

const getLocalContacts = (): Contact[] => {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem('enei_contacts')
  if (!data) {
    const initial = getInitialContacts()
    localStorage.setItem('enei_contacts', JSON.stringify(initial))
    return initial
  }
  return JSON.parse(data)
}

const saveLocalContacts = (contacts: Contact[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('enei_contacts', JSON.stringify(contacts))
  }
}

export const contactService = {
  isLocalMode(): boolean {
    return !isSupabaseConfigured()
  },

  // ----------------------------------------------------
  // ENTITIES ACTIONS
  // ----------------------------------------------------
  async getEntities(): Promise<ContactEntity[]> {
    if (!isSupabaseConfigured()) {
      return getLocalEntities()
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('contact_entities')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      return data || []
    } catch (e) {
      console.warn('Failed to fetch contact entities from Supabase, falling back to LocalStorage:', e)
      return getLocalEntities()
    }
  },

  async createEntity(name: string, description: string | null): Promise<ContactEntity> {
    const isConfigured = isSupabaseConfigured()
    const newEntity: ContactEntity = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      name,
      description: description || null,
      created_at: new Date().toISOString()
    }

    if (!isConfigured) {
      const entities = getLocalEntities()
      const updated = [...entities, newEntity].sort((a, b) => a.name.localeCompare(b.name))
      saveLocalEntities(updated)
      return newEntity
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('contact_entities')
        .insert([{ name, description }])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (e) {
      console.warn('Failed to create contact entity in Supabase, saving to LocalStorage:', e)
      const entities = getLocalEntities()
      const updated = [...entities, newEntity].sort((a, b) => a.name.localeCompare(b.name))
      saveLocalEntities(updated)
      return newEntity
    }
  },

  async deleteEntity(id: string): Promise<void> {
    const isConfigured = isSupabaseConfigured()

    if (!isConfigured) {
      // Delete entity
      const entities = getLocalEntities()
      const updatedEntities = entities.filter(e => e.id !== id)
      saveLocalEntities(updatedEntities)

      // Cascade delete contacts
      const contacts = getLocalContacts()
      const updatedContacts = contacts.filter(c => c.entity_id !== id)
      saveLocalContacts(updatedContacts)
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('contact_entities')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (e) {
      console.warn('Failed to delete contact entity from Supabase, executing cascade delete locally:', e)
      const entities = getLocalEntities()
      const updatedEntities = entities.filter(e => e.id !== id)
      saveLocalEntities(updatedEntities)

      const contacts = getLocalContacts()
      const updatedContacts = contacts.filter(c => c.entity_id !== id)
      saveLocalContacts(updatedContacts)
    }
  },

  // ----------------------------------------------------
  // CONTACTS ACTIONS
  // ----------------------------------------------------
  async getContacts(entityId?: string): Promise<Contact[]> {
    if (!isSupabaseConfigured()) {
      const contacts = getLocalContacts()
      if (entityId) {
        return contacts.filter(c => c.entity_id === entityId)
      }
      return contacts
    }

    try {
      const supabase = createClient()
      let query = supabase.from('contacts').select('*').order('name', { ascending: true })
      
      if (entityId) {
        query = query.eq('entity_id', entityId)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    } catch (e) {
      console.warn('Failed to fetch contacts from Supabase, falling back to LocalStorage:', e)
      const contacts = getLocalContacts()
      if (entityId) {
        return contacts.filter(c => c.entity_id === entityId)
      }
      return contacts
    }
  },

  async createContact(
    entity_id: string,
    name: string,
    role: string | null,
    email: string | null,
    phone: string | null,
    notes: string | null
  ): Promise<Contact> {
    const isConfigured = isSupabaseConfigured()
    const newContact: Contact = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      entity_id,
      name,
      role: role || null,
      email: email || null,
      phone: phone || null,
      notes: notes || null,
      created_at: new Date().toISOString()
    }

    if (!isConfigured) {
      const contacts = getLocalContacts()
      const updated = [...contacts, newContact].sort((a, b) => a.name.localeCompare(b.name))
      saveLocalContacts(updated)
      return newContact
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('contacts')
        .insert([{ entity_id, name, role, email, phone, notes }])
        .select()
        .single()

      if (error) throw error
      return data
    } catch (e) {
      console.warn('Failed to create contact in Supabase, saving to LocalStorage:', e)
      const contacts = getLocalContacts()
      const updated = [...contacts, newContact].sort((a, b) => a.name.localeCompare(b.name))
      saveLocalContacts(updated)
      return newContact
    }
  },

  async deleteContact(id: string): Promise<void> {
    const isConfigured = isSupabaseConfigured()

    if (!isConfigured) {
      const contacts = getLocalContacts()
      const updated = contacts.filter(c => c.id !== id)
      saveLocalContacts(updated)
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (e) {
      console.warn('Failed to delete contact from Supabase, removing locally:', e)
      const contacts = getLocalContacts()
      const updated = contacts.filter(c => c.id !== id)
      saveLocalContacts(updated)
    }
  }
}
