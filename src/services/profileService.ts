import { createClient } from '@/utils/supabase/client'

export interface UserProfile {
  id: string
  full_name: string
  role: string
  department: string
  avatar_color: string
  email?: string | null
  login_email?: string | null
  account_state: 'active' | 'pending' | 'inactive'
}

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && !url.includes('your-project') && !key.includes('your-anon-key')
}

export const profileService = {
  async getProfile(): Promise<UserProfile> {
    // 1. Try to get from localStorage cache first for instant UI response
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('enei_user_profile')
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          // Fetch from Supabase in the background to update the cache silently
          if (isSupabaseConfigured()) {
            this.syncSupabaseProfileInBackground().catch(() => {})
          }
          return parsed
        } catch {}
      }
    }

    // 2. Local Mode Fallback
    if (!isSupabaseConfigured()) {
      const defaultProfile: UserProfile = {
        id: 'local-user',
        full_name: 'David Gonçalves',
        role: 'Coordenador Geral',
        department: 'Geral',
        avatar_color: 'bg-indigo-500',
        email: 'david@enei.pt',
        login_email: 'david@enei.pt',
        account_state: 'active'
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('enei_user_profile', JSON.stringify(defaultProfile))
      }
      return defaultProfile
    }

    // 3. Supabase fallback on first load
    return this.syncSupabaseProfileInBackground()
  },

  async syncSupabaseProfileInBackground(): Promise<UserProfile> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Try to get profile from DB
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error || !data) {
      // If profile does not exist, create a default one
      const defaultProfile: UserProfile = {
        id: user.id,
        full_name: user.email?.split('@')[0] || 'Membro do Staff',
        role: 'Membro',
        department: 'Geral',
        avatar_color: 'bg-indigo-500',
        email: user.email,
        login_email: user.email,
        account_state: 'active'
      }

      await supabase.from('profiles').upsert(defaultProfile)
      if (typeof window !== 'undefined') {
        localStorage.setItem('enei_user_profile', JSON.stringify(defaultProfile))
      }
      return defaultProfile
    }

    let accountState = data.account_state || 'active'
    if (accountState === 'pending') {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ account_state: 'active' })
        .eq('id', user.id)
      if (!updateError) {
        accountState = 'active'
      }
    }

    const profile: UserProfile = {
      id: data.id,
      full_name: data.full_name || 'Membro do Staff',
      role: data.role || 'Membro',
      department: data.department || 'Geral',
      avatar_color: data.avatar_color || 'bg-indigo-500',
      email: data.email,
      login_email: data.login_email,
      account_state: accountState
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('enei_user_profile', JSON.stringify(profile))
    }
    return profile
  },

  async updateProfile(profile: Omit<UserProfile, 'id'>): Promise<UserProfile> {
    if (!isSupabaseConfigured()) {
      const updated: UserProfile = {
        id: 'local-user',
        ...profile
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('enei_user_profile', JSON.stringify(updated))
      }
      return updated
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const updated: UserProfile = {
      id: user.id,
      ...profile
    }

    // Save to local cache instantly for zero-latency UI reactivity
    if (typeof window !== 'undefined') {
      localStorage.setItem('enei_user_profile', JSON.stringify(updated))
    }

    const { error } = await supabase
      .from('profiles')
      .upsert(updated)

    if (error) {
      throw error
    }

    return updated
  },

  async getProfilesCount(): Promise<number> {
    if (!isSupabaseConfigured()) {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('enei_simulated_users')
        if (stored) {
          try {
            const users = JSON.parse(stored)
            const activeCount = users.filter((u: { account_state: string }) => u.account_state === 'active').length
            return activeCount
          } catch {}
        }
      }
      return 1
    }
    try {
      const supabase = createClient()
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('account_state', 'active')
      if (error) throw error
      return count || 0
    } catch (e) {
      console.warn('Failed to fetch profiles count from Supabase:', e)
      return 1
    }
  }
}
