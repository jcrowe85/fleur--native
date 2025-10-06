-- WARNING: This will delete ALL users from auth.users table
-- Only run this if you want to start completely fresh
-- Make sure to backup any important data first!

-- 1. First, let's see what we're about to delete
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN email LIKE '%@guest.local' THEN 1 END) as guest_users,
  COUNT(CASE WHEN email NOT LIKE '%@guest.local' THEN 1 END) as real_users
FROM auth.users;

-- 2. See the users that will be deleted
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  CASE 
    WHEN email LIKE '%@guest.local' THEN 'Guest User'
    WHEN email_confirmed_at IS NULL THEN 'Unconfirmed Real User'
    ELSE 'Confirmed Real User'
  END as user_type
FROM auth.users
ORDER BY created_at DESC;

-- 3. Delete all related data first (to avoid foreign key constraints)
-- Delete from all tables that reference auth.users (in correct order)

-- Delete from user_sync_data
DELETE FROM user_sync_data;

-- Delete from sync_analytics
DELETE FROM sync_analytics;

-- Delete from notification_promotions
DELETE FROM notification_promotions;

-- Delete from support_messages
DELETE FROM support_messages;

-- Delete from profiles (if exists)
DELETE FROM profiles;

-- Note: promotion_templates does NOT reference auth.users, so we don't delete it

-- 4. Now delete all users from auth.users
-- WARNING: This is irreversible!
DELETE FROM auth.users;

-- 5. Verify the cleanup
SELECT COUNT(*) as remaining_users FROM auth.users;

-- 6. Check that related tables are also clean
SELECT COUNT(*) as user_sync_data_count FROM user_sync_data;
SELECT COUNT(*) as sync_analytics_count FROM sync_analytics;
SELECT COUNT(*) as notification_promotions_count FROM notification_promotions;
SELECT COUNT(*) as support_messages_count FROM support_messages;
SELECT COUNT(*) as profiles_count FROM profiles;

-- 7. Reset any sequences if needed (optional)
-- SELECT setval('auth.users_id_seq', 1, false);

-- 8. Optional: Create a test guest user to verify the system works
-- INSERT INTO auth.users (
--   id,
--   email,
--   encrypted_password,
--   email_confirmed_at,
--   created_at,
--   updated_at,
--   raw_app_meta_data,
--   raw_user_meta_data,
--   is_super_admin,
--   last_sign_in_at,
--   app_metadata,
--   user_metadata
-- ) VALUES (
--   gen_random_uuid(),
--   'test@guest.local',
--   crypt('password123', gen_salt('bf')),
--   NOW(),
--   NOW(),
--   NOW(),
--   '{"provider": "email", "providers": ["email"]}',
--   '{}',
--   false,
--   NOW(),
--   '{"provider": "email", "providers": ["email"]}',
--   '{}'
-- );
