-- Create a dedicated user for the webhook with limited permissions
-- Run this in your Supabase SQL Editor

-- Create a new user (you'll need to do this in Supabase Auth dashboard)
-- Then run this SQL to grant specific permissions:

-- Grant permission to insert into support_messages table only
GRANT INSERT ON public.support_messages TO authenticated;

-- Create a policy that allows the webhook to insert replies
CREATE POLICY "Webhook can insert support replies"
  ON public.support_messages FOR INSERT
  WITH CHECK (is_from_user = false);

-- Optional: Create a function that the webhook can call instead of direct table access
CREATE OR REPLACE FUNCTION insert_support_reply(
  p_user_id uuid,
  p_message_text text,
  p_thread_ts text,
  p_message_ts text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.support_messages (
    user_id,
    message_text,
    is_from_user,
    slack_thread_ts,
    slack_message_ts
  ) VALUES (
    p_user_id,
    p_message_text,
    false,
    p_thread_ts,
    p_message_ts
  );
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION insert_support_reply TO authenticated;
