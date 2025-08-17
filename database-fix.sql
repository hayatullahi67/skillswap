-- Fix for missing created_at column in sessions table
-- Run this in your Supabase SQL editor if you're getting the "column does not exist" error

-- Check if created_at column exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'sessions' 
        AND column_name = 'created_at'
    ) THEN
        -- Add the missing created_at column
        ALTER TABLE sessions 
        ADD COLUMN created_at timestamp DEFAULT now();
        
        -- Update existing rows to have a created_at value
        UPDATE sessions 
        SET created_at = COALESCE(started_at, now()) 
        WHERE created_at IS NULL;
        
        RAISE NOTICE 'Added created_at column to sessions table';
    ELSE
        RAISE NOTICE 'created_at column already exists in sessions table';
    END IF;
END $$;

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'sessions'
ORDER BY ordinal_position;