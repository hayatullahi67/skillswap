-- Migration to ensure all required columns exist in sessions table
-- Run this in your Supabase SQL editor

DO $$ 
BEGIN
    -- Check and add room_id column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'sessions' 
        AND column_name = 'room_id'
    ) THEN
        ALTER TABLE sessions ADD COLUMN room_id text;
        RAISE NOTICE 'Added room_id column to sessions table';
    ELSE
        RAISE NOTICE 'room_id column already exists in sessions table';
    END IF;

    -- Check and add status column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'sessions' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE sessions ADD COLUMN status text CHECK (status IN ('pending', 'accepted', 'rejected', 'ended')) DEFAULT 'pending';
        RAISE NOTICE 'Added status column to sessions table';
    ELSE
        RAISE NOTICE 'status column already exists in sessions table';
    END IF;

    -- Check and add mode column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'sessions' 
        AND column_name = 'mode'
    ) THEN
        ALTER TABLE sessions ADD COLUMN mode text CHECK (mode IN ('live', 'tutorial'));
        RAISE NOTICE 'Added mode column to sessions table';
    ELSE
        RAISE NOTICE 'mode column already exists in sessions table';
    END IF;

    -- Check and add started_at column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'sessions' 
        AND column_name = 'started_at'
    ) THEN
        ALTER TABLE sessions ADD COLUMN started_at timestamp;
        RAISE NOTICE 'Added started_at column to sessions table';
    ELSE
        RAISE NOTICE 'started_at column already exists in sessions table';
    END IF;

    -- Check and add ended_at column
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'sessions' 
        AND column_name = 'ended_at'
    ) THEN
        ALTER TABLE sessions ADD COLUMN ended_at timestamp;
        RAISE NOTICE 'Added ended_at column to sessions table';
    ELSE
        RAISE NOTICE 'ended_at column already exists in sessions table';
    END IF;
END $$;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Alternative: Drop and recreate the sessions table with all columns
-- Uncomment this section if the above doesn't work and you don't mind losing existing session data

/*
DROP TABLE IF EXISTS sessions CASCADE;

CREATE TABLE sessions (
    id bigserial primary key,
    host_id uuid references profiles(id) on delete set null,
    learner_id uuid references profiles(id) on delete set null,
    skill_name text not null,
    mode text check (mode in ('live', 'tutorial')),
    status text check (status in ('pending', 'accepted', 'rejected', 'ended')) default 'pending',
    room_id text,
    created_at timestamp default now(),
    started_at timestamp,
    ended_at timestamp
);

-- Re-enable RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies
CREATE POLICY "Users can view their sessions" ON sessions
    FOR SELECT USING (auth.uid() = host_id OR auth.uid() = learner_id);

CREATE POLICY "Users can insert sessions" ON sessions
    FOR INSERT WITH CHECK (auth.uid() = host_id OR auth.uid() = learner_id);

CREATE POLICY "Users can update their sessions" ON sessions
    FOR UPDATE USING (auth.uid() = host_id OR auth.uid() = learner_id);
*/