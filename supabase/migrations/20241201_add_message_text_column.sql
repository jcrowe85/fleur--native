-- Add missing message_text column to support_messages table
-- This fixes the "Could not find the 'message_text' column" error

-- Check if message_text column exists and add it if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'support_messages' 
        AND column_name = 'message_text' 
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Adding missing message_text column...';
        ALTER TABLE support_messages ADD COLUMN message_text TEXT NOT NULL DEFAULT '';
        RAISE NOTICE 'Added message_text column';
    ELSE
        RAISE NOTICE 'message_text column already exists';
    END IF;
END $$;

-- Refresh schema cache to ensure the column is recognized
NOTIFY pgrst, 'reload schema';
