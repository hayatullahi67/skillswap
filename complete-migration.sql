-- Complete Migration Script for SkillMentor AI Live Sessions
-- Run this in your Supabase SQL Editor

-- Step 1: Check current sessions table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'sessions' 
ORDER BY ordinal_position;

-- Step 2: Add all missing columns
DO $$ 
BEGIN
    -- Add created_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE sessions ADD COLUMN created_at timestamp DEFAULT now();
        RAISE NOTICE 'Added created_at column to sessions table';
    END IF;

    -- Add status column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'status'
    ) THEN
        ALTER TABLE sessions ADD COLUMN status text DEFAULT 'pending' 
        CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'ended'));
        RAISE NOTICE 'Added status column to sessions table';
    END IF;

    -- Add room_id column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'room_id'
    ) THEN
        ALTER TABLE sessions ADD COLUMN room_id text;
        RAISE NOTICE 'Added room_id column to sessions table';
    END IF;

    -- Add mode column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'mode'
    ) THEN
        ALTER TABLE sessions ADD COLUMN mode text DEFAULT 'live'
        CHECK (mode IN ('live', 'tutorial'));
        RAISE NOTICE 'Added mode column to sessions table';
    END IF;

    -- Add started_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'started_at'
    ) THEN
        ALTER TABLE sessions ADD COLUMN started_at timestamp;
        RAISE NOTICE 'Added started_at column to sessions table';
    END IF;

    -- Add ended_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'ended_at'
    ) THEN
        ALTER TABLE sessions ADD COLUMN ended_at timestamp;
        RAISE NOTICE 'Added ended_at column to sessions table';
    END IF;

    -- Add expires_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sessions' AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE sessions ADD COLUMN expires_at timestamp;
        RAISE NOTICE 'Added expires_at column to sessions table';
    END IF;
END $$;

-- Step 3: Update existing rows to have default values
UPDATE sessions SET 
    created_at = now(),
    status = COALESCE(status, 'ended'),
    mode = COALESCE(mode, 'live')
WHERE created_at IS NULL OR status IS NULL OR mode IS NULL;

-- Step 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_host_status ON sessions(host_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_learner_status ON sessions(learner_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Step 5: Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Step 6: Verify the final table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'sessions' 
ORDER BY ordinal_position;

-- Step 7: Test query (replace 'your-user-id' with actual user ID)
-- SELECT id, learner_id, skill_name, status, created_at 
-- FROM sessions 
-- WHERE host_id = 'your-user-id' AND status = 'pending'
-- ORDER BY created_at DESC;

RAISE NOTICE 'Migration completed successfully!';