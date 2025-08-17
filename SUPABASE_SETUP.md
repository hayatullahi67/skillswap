# 🗄️ Supabase Setup Guide

## The Error
`TypeError: Failed to construct 'URL': Invalid URL` means your Supabase environment variables are missing or incorrect.

## Quick Fix

### Step 1: Get Supabase Credentials

1. **Go to Supabase Dashboard**: [https://supabase.com/dashboard](https://supabase.com/dashboard)

2. **Create Project** (if you don't have one):
   - Click "New Project"
   - Choose organization
   - Enter project name: "skillswap-app"
   - Choose region (closest to you)
   - Create project (takes ~2 minutes)

3. **Get API Credentials**:
   - Go to **Settings** → **API**
   - Copy these two values:
     - **Project URL**: `https://your-project-id.supabase.co`
     - **Anon/Public Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Step 2: Update .env.local

Edit your `.env.local` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-actual-anon-key

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# API Configuration
NEXT_PUBLIC_KIRO_API_URL=http://localhost:3000/api
```

### Step 3: Set Up Database Schema

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable RLS
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  timezone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_skills table
CREATE TABLE user_skills (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  skill_name TEXT NOT NULL,
  skill_type TEXT CHECK (skill_type IN ('teach', 'learn')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sessions table
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  host_id UUID REFERENCES auth.users(id),
  learner_id UUID REFERENCES auth.users(id),
  skill_name TEXT NOT NULL,
  mode TEXT CHECK (mode IN ('live', 'tutorial')) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Create session_resources table
CREATE TABLE session_resources (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES sessions(id) NOT NULL,
  resource_type TEXT CHECK (resource_type IN ('summary', 'cheatsheet', 'quiz', 'progress')) NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create availability table
CREATE TABLE availability (
  user_id UUID REFERENCES auth.users(id) PRIMARY KEY,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can manage own skills" ON user_skills FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view all skills" ON user_skills FOR SELECT TO authenticated;

CREATE POLICY "Users can manage own sessions" ON sessions FOR ALL USING (auth.uid() = host_id OR auth.uid() = learner_id);
CREATE POLICY "Users can view session resources" ON session_resources FOR SELECT TO authenticated;
CREATE POLICY "Users can create session resources" ON session_resources FOR INSERT TO authenticated;

CREATE POLICY "Users can manage own availability" ON availability FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can view all availability" ON availability FOR SELECT TO authenticated;
```

### Step 4: Restart Development Server

```bash
# Stop server (Ctrl+C)
npm run dev
```

## Alternative: Skip Supabase for Now

If you just want to test the AI tutorials without setting up Supabase, you can temporarily disable it:

### Option 1: Mock Supabase Client

Replace the content of `lib/supabaseClient.ts` with:

```typescript
// Mock Supabase client for testing
export const supabase = {
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    signUp: () => Promise.resolve({ data: { user: null }, error: null }),
    signInWithPassword: () => Promise.resolve({ data: { user: null }, error: null }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  },
  from: () => ({
    insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 1 }, error: null }) }) }),
    update: () => ({ eq: () => Promise.resolve({ error: null }) }),
    select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) })
  })
}

// Type definitions remain the same
export type Profile = {
  id: string
  name: string
  location?: string
  timezone?: string
  created_at: string
}

// ... rest of types
```

This lets you test AI tutorials without Supabase setup.

## What's Next?

1. **Set up Supabase** (recommended for full functionality)
2. **Or use mock client** (quick testing)
3. **Then focus on OpenAI setup** for AI tutorials

The error should be gone after either approach! 🚀