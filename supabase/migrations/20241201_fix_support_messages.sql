-- Fix support_messages table structure
-- This addresses the missing message_text column error

-- First, check if the table exists and what columns it has
DO $$ 
BEGIN
    -- Check if support_messages table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_messages' AND table_schema = 'public') THEN
        RAISE NOTICE 'Creating support_messages table...';
        
        -- Create the table with correct structure
        CREATE TABLE support_messages (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
            message_text TEXT NOT NULL,
            is_from_user BOOLEAN DEFAULT true,
            status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
            slack_thread_ts TEXT,
            slack_message_ts TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        RAISE NOTICE 'Created support_messages table with correct structure';
    ELSE
        RAISE NOTICE 'support_messages table exists, checking columns...';
        
        -- Check if message_text column exists
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
        
        -- Check if other required columns exist and add them if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'support_messages' 
            AND column_name = 'is_from_user' 
            AND table_schema = 'public'
        ) THEN
            RAISE NOTICE 'Adding missing is_from_user column...';
            ALTER TABLE support_messages ADD COLUMN is_from_user BOOLEAN DEFAULT true;
            RAISE NOTICE 'Added is_from_user column';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'support_messages' 
            AND column_name = 'status' 
            AND table_schema = 'public'
        ) THEN
            RAISE NOTICE 'Adding missing status column...';
            ALTER TABLE support_messages ADD COLUMN status TEXT DEFAULT 'pending';
            RAISE NOTICE 'Added status column';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'support_messages' 
            AND column_name = 'slack_thread_ts' 
            AND table_schema = 'public'
        ) THEN
            RAISE NOTICE 'Adding missing slack_thread_ts column...';
            ALTER TABLE support_messages ADD COLUMN slack_thread_ts TEXT;
            RAISE NOTICE 'Added slack_thread_ts column';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'support_messages' 
            AND column_name = 'slack_message_ts' 
            AND table_schema = 'public'
        ) THEN
            RAISE NOTICE 'Adding missing slack_message_ts column...';
            ALTER TABLE support_messages ADD COLUMN slack_message_ts TEXT;
            RAISE NOTICE 'Added slack_message_ts column';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'support_messages' 
            AND column_name = 'updated_at' 
            AND table_schema = 'public'
        ) THEN
            RAISE NOTICE 'Adding missing updated_at column...';
            ALTER TABLE support_messages ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE 'Added updated_at column';
        END IF;
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_support_messages_user_id ON support_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_support_messages_is_from_user ON support_messages(is_from_user);
CREATE INDEX IF NOT EXISTS idx_support_messages_status ON support_messages(status);

-- Enable RLS
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own support messages" ON support_messages;
DROP POLICY IF EXISTS "Users can insert their own support messages" ON support_messages;
DROP POLICY IF EXISTS "Service role can manage all support messages" ON support_messages;
DROP POLICY IF EXISTS "Webhook can insert support replies" ON support_messages;

-- Create RLS policies
CREATE POLICY "Users can view their own support messages" ON support_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own support messages" ON support_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all support messages" ON support_messages
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Webhook can insert support replies" ON support_messages
  FOR INSERT WITH CHECK (is_from_user = false);

-- Create update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_support_messages_updated_at ON support_messages;
CREATE TRIGGER update_support_messages_updated_at
  BEFORE UPDATE ON support_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT INSERT ON support_messages TO authenticated;
GRANT SELECT ON support_messages TO authenticated;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
