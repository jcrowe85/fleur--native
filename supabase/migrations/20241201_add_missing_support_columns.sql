-- Add missing columns to support_messages table
-- Based on the slackService.ts requirements

-- Add slack_thread_ts column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'support_messages' 
        AND column_name = 'slack_thread_ts' 
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Adding slack_thread_ts column...';
        ALTER TABLE support_messages ADD COLUMN slack_thread_ts TEXT;
        RAISE NOTICE 'Added slack_thread_ts column';
    ELSE
        RAISE NOTICE 'slack_thread_ts column already exists';
    END IF;
END $$;

-- Add slack_message_ts column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'support_messages' 
        AND column_name = 'slack_message_ts' 
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Adding slack_message_ts column...';
        ALTER TABLE support_messages ADD COLUMN slack_message_ts TEXT;
        RAISE NOTICE 'Added slack_message_ts column';
    ELSE
        RAISE NOTICE 'slack_message_ts column already exists';
    END IF;
END $$;

-- Add updated_at column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'support_messages' 
        AND column_name = 'updated_at' 
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE 'Adding updated_at column...';
        ALTER TABLE support_messages ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column';
    ELSE
        RAISE NOTICE 'updated_at column already exists';
    END IF;
END $$;

-- Create update trigger for updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop and recreate trigger to avoid conflicts
DROP TRIGGER IF EXISTS update_support_messages_updated_at ON support_messages;
CREATE TRIGGER update_support_messages_updated_at
  BEFORE UPDATE ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

RAISE NOTICE 'Support messages table structure updated successfully';
