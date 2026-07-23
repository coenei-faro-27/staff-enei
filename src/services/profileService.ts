import { createClient } from '@/utils/supabase/client'

export interface UserProfile {
  id: string
  full_name: string
  role: string
  department: string
  avatar_color: string
  email?: string | null
  login_email?: string | null
  account_state?: 'active' | 'pending' | 'inactive'
  is_active?: boolean
  is_pending?: boolean
}

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && !url.includes('your-project') && !key.includes('your-anon-key')
}

export const profileService = {
  clearProfileCache() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('enei_user_profile')
      window.dispatchEvent(new Event('profile-updated'))
    }
  },

  async getProfile(): Promise<UserProfile> {
    // 1. Local Mode Fallback
    if (!isSupabaseConfigured()) {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('enei_user_profile')
        if (cached) {
          try {
            return JSON.parse(cached)
          } catch {}
        }
      }
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

    // 2. Supabase Mode: Get currently authenticated user
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      this.clearProfileCache()
      throw new Error('User not authenticated')
    }

    // 3. Verify cached profile against active authenticated user ID
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('enei_user_profile')
      if (cached) {
        try {
          const parsed: UserProfile = JSON.parse(cached)
          if (parsed && parsed.id === user.id) {
            // Cache is valid for the active user -> return immediately & sync in background
            this.syncSupabaseProfileForUser(user.id).catch(() => {})
            return parsed
          } else {
            // Cache belongs to a previous user -> invalidate cache!
            localStorage.removeItem('enei_user_profile')
          }
        } catch {}
      }
    }

    // 4. Fetch fresh profile directly from DB
    return this.syncSupabaseProfileForUser(user.id)
  },

  async syncSupabaseProfileInBackground(): Promise<UserProfile> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }
    return this.syncSupabaseProfileForUser(user.id)
  },

  async syncSupabaseProfileForUser(userId: string): Promise<UserProfile> {
    const supabase = createClient()
    
    // Try to get profile from DB
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    let finalProfile: UserProfile

    if (error || !data) {
      const { data: { user } } = await supabase.auth.getUser()
      const userEmail = user?.email || 'Membro do Staff'
      const defaultProfile: UserProfile = {
        id: userId,
        full_name: userEmail.split('@')[0],
        role: 'Membro',
        department: 'Geral',
        avatar_color: 'bg-indigo-500',
        email: userEmail,
        login_email: userEmail,
        account_state: 'active'
      }

      await supabase.from('profiles').upsert(defaultProfile)
      finalProfile = defaultProfile
    } else {
      let accountState = data.account_state || (data.is_pending ? 'pending' : data.is_active !== false ? 'active' : 'inactive')
      if (accountState === 'pending') {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ account_state: 'active' })
          .eq('id', userId)
        if (updateError) {
          await supabase
            .from('profiles')
            .update({ is_pending: false })
            .eq('id', userId)
        }
        accountState = 'active'
      }

      finalProfile = {
        id: data.id,
        full_name: data.full_name || 'Membro do Staff',
        role: data.role || 'Membro',
        department: data.department || 'Geral',
        avatar_color: data.avatar_color || 'bg-indigo-500',
        email: data.email,
        login_email: data.login_email,
        account_state: accountState
      }
    }

    if (typeof window !== 'undefined') {
      const oldCached = localStorage.getItem('enei_user_profile')
      localStorage.setItem('enei_user_profile', JSON.stringify(finalProfile))
      
      // Dispatch profile-updated event if cache changed to trigger UI re-render
      if (oldCached !== JSON.stringify(finalProfile)) {
        window.dispatchEvent(new Event('profile-updated'))
      }
    }

    return finalProfile
  },

  async updateProfile(profile: Omit<UserProfile, 'id'>): Promise<UserProfile> {
    if (!isSupabaseConfigured()) {
      const updated: UserProfile = {
        id: 'local-user',
        ...profile
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('enei_user_profile', JSON.stringify(updated))
        window.dispatchEvent(new Event('profile-updated'))
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
      window.dispatchEvent(new Event('profile-updated'))
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
            const activeCount = users.filter((u: { account_state?: string }) => u.account_state === 'active').length
            return Math.max(0, activeCount - 1)
          } catch {}
        }
      }
      return 0
    }
    try {
      const supabase = createClient()
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('account_state', 'active')
      if (error) throw error
      const total = count || 0
      return Math.max(0, total - 1)
    } catch (e) {
      console.warn('Failed to fetch profiles count from Supabase:', e)
      return 0
    }
  }
}
