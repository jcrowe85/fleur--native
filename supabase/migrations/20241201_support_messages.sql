-- Create support_messages table
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_support_messages_user_id ON support_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at);

-- Enable RLS
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see their own messages
CREATE POLICY "Users can view their own support messages" ON support_messages
  FOR SELECT USING (auth.uid() = user_id);

-- Create policy for users to insert their own messages
CREATE POLICY "Users can insert their own support messages" ON support_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy for service role to manage all messages (for admin/support team)
CREATE POLICY "Service role can manage all support messages" ON support_messages
  FOR ALL USING (auth.role() = 'service_role');
