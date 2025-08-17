-- SkillSwap Database Schema
-- Run these commands in your Supabase SQL editor

-- 1. Profiles Table
create table profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    name text not null,
    location text,
    timezone text,
    created_at timestamp default now()
);

-- 2. User Skills Table
create table user_skills (
    id bigserial primary key,
    user_id uuid references profiles(id) on delete cascade,
    skill_name text not null,
    skill_type text check (skill_type in ('teach', 'learn')), -- 'teach' or 'learn'
    created_at timestamp default now()
);

-- 3. Sessions Table
create table sessions (
    id bigserial primary key,
    host_id uuid references profiles(id) on delete set null,
    learner_id uuid references profiles(id) on delete set null,
    skill_name text not null,
    mode text check (mode in ('live', 'tutorial')), -- 'live' or 'tutorial'
    status text check (status in ('pending', 'accepted', 'rejected', 'ended')) default 'pending',
    room_id text, -- PeerJS room ID for video calls
    created_at timestamp default now(),
    started_at timestamp, -- when call was accepted
    ended_at timestamp
);

-- 4. Session Resources Table
create table session_resources (
    id bigserial primary key,
    session_id bigint references sessions(id) on delete cascade,
    resource_type text check (resource_type in ('summary', 'cheatsheet', 'quiz', 'progress')),
    content text,
    created_at timestamp default now()
);

-- 5. Availability Table
create table availability (
    user_id uuid primary key references profiles(id) on delete cascade,
    is_online boolean default false,
    last_seen timestamp default now()
);

-- Enable Row Level Security (RLS)
alter table profiles enable row level security;
alter table user_skills enable row level security;
alter table sessions enable row level security;
alter table session_resources enable row level security;
alter table availability enable row level security;

-- RLS Policies

-- Profiles: Users can read all profiles but only update their own
create policy "Public profiles are viewable by everyone" on profiles
    for select using (true);

create policy "Users can insert their own profile" on profiles
    for insert with check (auth.uid() = id);

create policy "Users can update own profile" on profiles
    for update using (auth.uid() = id);

-- User Skills: Users can manage their own skills
create policy "Users can view all skills" on user_skills
    for select using (true);

create policy "Users can insert own skills" on user_skills
    for insert with check (auth.uid() = user_id);

create policy "Users can update own skills" on user_skills
    for update using (auth.uid() = user_id);

create policy "Users can delete own skills" on user_skills
    for delete using (auth.uid() = user_id);

-- Sessions: Users can view sessions they're part of
create policy "Users can view their sessions" on sessions
    for select using (auth.uid() = host_id or auth.uid() = learner_id);

create policy "Users can insert sessions" on sessions
    for insert with check (auth.uid() = host_id or auth.uid() = learner_id);

create policy "Users can update their sessions" on sessions
    for update using (auth.uid() = host_id or auth.uid() = learner_id);

-- Session Resources: Users can view resources from their sessions
create policy "Users can view session resources" on session_resources
    for select using (
        exists (
            select 1 from sessions 
            where sessions.id = session_resources.session_id 
            and (sessions.host_id = auth.uid() or sessions.learner_id = auth.uid())
        )
    );

create policy "Users can insert session resources" on session_resources
    for insert with check (
        exists (
            select 1 from sessions 
            where sessions.id = session_resources.session_id 
            and (sessions.host_id = auth.uid() or sessions.learner_id = auth.uid())
        )
    );

-- Availability: Users can manage their own availability
create policy "Users can view all availability" on availability
    for select using (true);

create policy "Users can manage own availability" on availability
    for all using (auth.uid() = user_id);

-- Functions and Triggers

-- Drop existing trigger and function if they exist (for clean setup)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Insert into profiles table
    INSERT INTO public.profiles (id, name)
    VALUES (
        NEW.id, 
        COALESCE(
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'full_name', 
            split_part(NEW.email, '@', 1),
            'User'
        )
    );
    
    -- Insert into availability table
    INSERT INTO public.availability (user_id, is_online)
    VALUES (NEW.id, false);
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update last_seen timestamp
create or replace function public.update_last_seen()
returns trigger as $$
begin
    new.last_seen = now();
    return new;
end;
$$ language plpgsql;

-- Trigger to update last_seen on availability changes
create trigger update_availability_last_seen
    before update on availability
    for each row execute procedure public.update_last_seen();

-- Function to create missing profiles for existing users
CREATE OR REPLACE FUNCTION public.create_missing_profiles()
RETURNS void AS $$
DECLARE
    user_record RECORD;
BEGIN
    -- Find users without profiles
    FOR user_record IN 
        SELECT au.id, au.email, au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN public.profiles p ON au.id = p.id
        WHERE p.id IS NULL
    LOOP
        -- Create missing profile
        INSERT INTO public.profiles (id, name)
        VALUES (
            user_record.id,
            COALESCE(
                user_record.raw_user_meta_data->>'name',
                user_record.raw_user_meta_data->>'full_name',
                split_part(user_record.email, '@', 1),
                'User'
            )
        );
        
        -- Create missing availability record
        INSERT INTO public.availability (user_id, is_online)
        VALUES (user_record.id, false)
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE LOG 'Created profile for user: %', user_record.email;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;