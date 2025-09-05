import { createClient } from '@supabase/supabase-js'
import { createNetworkAwareSupabaseCall } from './networkUtils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Validate environment variables
if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
}

// Validate URL format
try {
  new URL(supabaseUrl)
} catch (error) {
  throw new Error(`Invalid NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl}. Must be a valid URL like https://your-project.supabase.co`)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'supabase-js-web'
    }
  }
})

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

// Network-aware wrapper functions for common Supabase operations
export const supabaseWithRetry = {
  auth: {
    signIn: (credentials: any) => 
      createNetworkAwareSupabaseCall(() => supabase.auth.signInWithPassword(credentials))(),
    signUp: (credentials: any) => 
      createNetworkAwareSupabaseCall(() => supabase.auth.signUp(credentials))(),
    signOut: () => 
      createNetworkAwareSupabaseCall(() => supabase.auth.signOut())(),
    getSession: () => 
      createNetworkAwareSupabaseCall(() => supabase.auth.getSession())(),
  },
  from: (table: string) => ({
    select: (query?: string) => 
      createNetworkAwareSupabaseCall(async () => await supabase.from(table).select(query)),
    insert: (data: any) => 
      createNetworkAwareSupabaseCall(async () => await supabase.from(table).insert(data)),
    update: (data: any) => 
      createNetworkAwareSupabaseCall(async () => await supabase.from(table).update(data)),
    delete: () => 
      createNetworkAwareSupabaseCall(async () => await supabase.from(table).delete()),
  })
}

// Connection health check
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from('profiles').select('count').limit(1)
    return !error
  } catch (error) {
    console.error('Supabase connection check failed:', error)
    return false
  }
}