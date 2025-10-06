-- Cleanup script for orphaned auth.users records
-- Run this in your Supabase SQL editor

-- 1. First, let's see what orphaned users we have
SELECT 
  au.id,
  au.email,
  au.created_at,
  au.email_confirmed_at,
  CASE 
    WHEN au.email LIKE '%@guest.local' THEN 'Guest User'
    WHEN au.email_confirmed_at IS NULL THEN 'Unconfirmed'
    ELSE 'Confirmed'
  END as user_status
FROM auth.users au
LEFT JOIN user_sync_data usd ON au.id = usd.user_id
WHERE usd.user_id IS NULL
ORDER BY au.created_at DESC;

-- 2. Check if there are any profiles for these users
SELECT 
  au.id,
  au.email,
  p.id as profile_id,
  p.display_name
FROM auth.users au
LEFT JOIN profiles p ON au.id = p.user_id
LEFT JOIN user_sync_data usd ON au.id = usd.user_id
WHERE usd.user_id IS NULL
ORDER BY au.created_at DESC;

-- 3. Option 1: Delete orphaned profiles (if any exist)
-- DELETE FROM profiles 
-- WHERE user_id IN (
--   SELECT au.id 
--   FROM auth.users au
--   LEFT JOIN user_sync_data usd ON au.id = usd.user_id
--   WHERE usd.user_id IS NULL
-- );

-- 4. Option 2: Mark orphaned users as deleted (safer approach)
-- UPDATE auth.users 
-- SET 
--   email = CONCAT('deleted_', EXTRACT(EPOCH FROM NOW()), '_', SUBSTRING(email FROM 1 FOR 10)),
--   raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"deleted": true, "deleted_at": "' || NOW()::text || '"}'::jsonb
-- WHERE id IN (
--   SELECT au.id 
--   FROM auth.users au
--   LEFT JOIN user_sync_data usd ON au.id = usd.user_id
--   WHERE usd.user_id IS NULL
--   AND au.email NOT LIKE '%@guest.local'
-- );

-- 5. Option 3: Create a function to clean up orphaned users
CREATE OR REPLACE FUNCTION cleanup_orphaned_auth_users()
RETURNS TABLE(
  user_id uuid,
  email text,
  action_taken text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    CASE 
      WHEN au.email LIKE '%@guest.local' THEN 'Skipped (guest user)'
      WHEN au.email_confirmed_at IS NULL THEN 'Marked as deleted (unconfirmed)'
      ELSE 'Marked as deleted (confirmed but orphaned)'
    END as action_taken
  FROM auth.users au
  LEFT JOIN user_sync_data usd ON au.id = usd.user_id
  WHERE usd.user_id IS NULL
  AND au.email NOT LIKE '%@guest.local'
  AND au.email NOT LIKE 'deleted_%';
  
  -- Mark the orphaned users as deleted
  UPDATE auth.users 
  SET 
    email = CONCAT('deleted_', EXTRACT(EPOCH FROM NOW()), '_', SUBSTRING(email FROM 1 FOR 10)),
    raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"deleted": true, "deleted_at": "' || NOW()::text || '"}'::jsonb
  WHERE id IN (
    SELECT au.id 
    FROM auth.users au
    LEFT JOIN user_sync_data usd ON au.id = usd.user_id
    WHERE usd.user_id IS NULL
    AND au.email NOT LIKE '%@guest.local'
    AND au.email NOT LIKE 'deleted_%'
  );
END;
$$ LANGUAGE plpgsql;

-- 6. Run the cleanup function
-- SELECT * FROM cleanup_orphaned_auth_users();

-- 7. Verify the cleanup
-- SELECT 
--   au.id,
--   au.email,
--   au.created_at,
--   au.raw_app_meta_data->>'deleted' as is_deleted
-- FROM auth.users au
-- ORDER BY au.created_at DESC;
