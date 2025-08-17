import { createClient } from '@supabase/supabase-js'

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

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

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