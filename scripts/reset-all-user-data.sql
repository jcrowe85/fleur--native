-- Complete reset script for all user-related data
-- WARNING: This will delete ALL user data from your database
-- Only run this if you want to start completely fresh

-- 1. Show current state before deletion
SELECT 'BEFORE DELETION - Current counts:' as status;
SELECT 
  'auth.users' as table_name,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  'user_sync_data' as table_name,
  COUNT(*) as count
FROM user_sync_data
UNION ALL
SELECT 
  'profiles' as table_name,
  COUNT(*) as count
FROM profiles;

-- 2. Delete all user-related data in correct order (to avoid foreign key constraints)

-- Delete from user_sync_data first
DELETE FROM user_sync_data;
SELECT 'Deleted from user_sync_data' as status;

-- Delete from profiles
DELETE FROM profiles;
SELECT 'Deleted from profiles' as status;

-- Delete from any other user-related tables
-- Add more DELETE statements here for other tables that reference auth.users
-- Examples:
-- DELETE FROM user_preferences;
-- DELETE FROM user_activity_logs;
-- DELETE FROM user_sessions;

-- 3. Delete all users from auth.users
DELETE FROM auth.users;
SELECT 'Deleted from auth.users' as status;

-- 4. Show state after deletion
SELECT 'AFTER DELETION - Remaining counts:' as status;
SELECT 
  'auth.users' as table_name,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  'user_sync_data' as table_name,
  COUNT(*) as count
FROM user_sync_data
UNION ALL
SELECT 
  'profiles' as table_name,
  COUNT(*) as count
FROM profiles;

-- 5. Reset sequences (optional - only if you want to start IDs from 1)
-- SELECT setval('auth.users_id_seq', 1, false);
-- SELECT setval('user_sync_data_id_seq', 1, false);
-- SELECT setval('profiles_id_seq', 1, false);

-- 6. Verify the reset
SELECT 'RESET COMPLETE' as status;
SELECT 'All user data has been deleted. The app will create new guest users on next startup.' as message;
