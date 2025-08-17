// Mock Supabase client for testing AI tutorials without database setup
export const supabase = {
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    signUp: () => Promise.resolve({ data: { user: null }, error: null }),
    signInWithPassword: () => Promise.resolve({ data: { user: null }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: () => ({ 
      data: { 
        subscription: { unsubscribe: () => {} } 
      } 
    })
  },
  from: () => ({
    insert: () => ({ 
      select: () => ({ 
        single: () => Promise.resolve({ data: { id: 1 }, error: null }) 
      }) 
    }),
    update: () => ({ 
      eq: () => Promise.resolve({ error: null }) 
    }),
    select: () => ({ 
      eq: () => Promise.resolve({ data: [], error: null }) 
    })
  })
}

export type Profile = {
  id: string
  name: string
  location?: string
  timezone?: string
  created_at: string
}

export type UserSkill = {
  id: number
  user_id: string
  skill_name: string
  skill_type: 'teach' | 'learn'
  created_at: string
}

export type Session = {
  id: number
  host_id?: string
  learner_id?: string
  skill_name: string
  mode: 'live' | 'tutorial'
  started_at: string
  ended_at?: string
}

export type SessionResource = {
  id: number
  session_id: number
  resource_type: 'summary' | 'cheatsheet' | 'quiz'
  content: string
  created_at: string
}

export type Availability = {
  user_id: string
  is_online: boolean
  last_seen: string
}