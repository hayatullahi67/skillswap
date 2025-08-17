import { create } from 'zustand'
import { supabase, Profile, UserSkill, Session } from './supabaseClient'

interface AppState {
  // User state
  user: any | null
  profile: Profile | null
  userSkills: UserSkill[]
  isOnline: boolean
  
  // Session state
  currentSession: Session | null
  recentSessions: Session[]
  
  // UI state
  sidebarOpen: boolean
  loading: boolean
  
  // Actions
  setUser: (user: any) => void
  setProfile: (profile: Profile | null) => void
  setUserSkills: (skills: UserSkill[]) => void
  setOnlineStatus: (isOnline: boolean) => void
  setCurrentSession: (session: Session | null) => void
  setRecentSessions: (sessions: Session[]) => void
  setSidebarOpen: (open: boolean) => void
  setLoading: (loading: boolean) => void
  
  // Async actions
  fetchProfile: () => Promise<void>
  fetchUserSkills: () => Promise<void>
  fetchRecentSessions: () => Promise<void>
  updateOnlineStatus: (isOnline: boolean) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  user: null,
  profile: null,
  userSkills: [],
  isOnline: false,
  currentSession: null,
  recentSessions: [],
  sidebarOpen: false,
  loading: false,

  // Setters
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setUserSkills: (userSkills) => set({ userSkills }),
  setOnlineStatus: (isOnline) => set({ isOnline }),
  setCurrentSession: (currentSession) => set({ currentSession }),
  setRecentSessions: (recentSessions) => set({ recentSessions }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setLoading: (loading) => set({ loading }),

  // Async actions
  fetchProfile: async () => {
    const { user } = get()
    if (!user) {
      console.log('No user found for profile fetch')
      return
    }

    try {
      console.log('Fetching profile for user:', user.id)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (error) {
        console.error('Profile fetch error:', error)
        // Don't throw error to prevent blocking login
        return
      }
      
      if (data) {
        console.log('Profile fetched successfully:', data)
        set({ profile: data })
      } else {
        console.log('No profile found for user')
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      // Don't throw error to prevent blocking login
    }
  },

  fetchUserSkills: async () => {
    const { user } = get()
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_skills')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error
      set({ userSkills: data || [] })
    } catch (error) {
      console.error('Error fetching user skills:', error)
    }
  },

  fetchRecentSessions: async () => {
    const { user } = get()
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .or(`host_id.eq.${user.id},learner_id.eq.${user.id}`)
        .order('started_at', { ascending: false })
        .limit(10)

      if (error) throw error
      set({ recentSessions: data || [] })
    } catch (error) {
      console.error('Error fetching recent sessions:', error)
    }
  },

  updateOnlineStatus: async (isOnline) => {
    const { user } = get()
    if (!user) return

    try {
      const { error } = await supabase
        .from('availability')
        .upsert({
          user_id: user.id,
          is_online: isOnline,
          last_seen: new Date().toISOString()
        })

      if (error) throw error
      set({ isOnline })
    } catch (error) {
      console.error('Error updating online status:', error)
    }
  }
}))