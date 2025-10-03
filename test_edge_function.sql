-- Test what the edge function is trying to insert
-- This will help us debug the issue

-- First, let's see the current profiles table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
ORDER BY ordinal_position;

-- Let's also check if there are any existing profiles
SELECT COUNT(*) as existing_profiles FROM profiles;

-- Let's see what a manual insert would look like (this should work)
-- Replace 'test-user-id' with an actual UUID from auth.users if you have any
INSERT INTO profiles (id, email, is_guest) 
VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid, 
    'test@example.com', 
    true
) 
ON CONFLICT (id) DO NOTHING;

-- Check if the insert worked
SELECT * FROM profiles WHERE email = 'test@example.com';

-- Clean up the test data
DELETE FROM profiles WHERE email = 'test@example.com';
