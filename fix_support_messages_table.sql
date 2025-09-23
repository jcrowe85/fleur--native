-- Fix the support_messages table by adding missing columns
-- Run this in your Supabase SQL Editor

-- Add missing columns to existing table
ALTER TABLE public.support_messages 
ADD COLUMN IF NOT EXISTS is_from_user boolean DEFAULT true;

ALTER TABLE public.support_messages 
ADD COLUMN IF NOT EXISTS slack_thread_ts text;

ALTER TABLE public.support_messages 
ADD COLUMN IF NOT EXISTS slack_message_ts text;

-- Update existing records to have is_from_user = true (since they're from users)
UPDATE public.support_messages 
SET is_from_user = true 
WHERE is_from_user IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_support_messages_user_id ON public.support_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON public.support_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_support_messages_is_from_user ON public.support_messages(is_from_user);
