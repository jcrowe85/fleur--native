-- Create support_messages table
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message_text text NOT NULL,
  is_from_user boolean DEFAULT true,
  slack_thread_ts text,
  slack_message_ts text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own support messages."
  ON public.support_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own support messages."
  ON public.support_messages FOR SELECT
  USING (auth.uid() = user_id);

-- Optional: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_support_messages_user_id ON public.support_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON public.support_messages(created_at);
