-- Query to find your data in the database
-- Run this in Supabase SQL Editor

-- 1. Check auth.users table for your email
SELECT 
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE email NOT LIKE '%@guest.local'
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check profiles table
SELECT * FROM profiles 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Check user_sync_data for your routine and points
SELECT 
  user_id,
  email,
  last_synced,
  routine_data,
  rewards_data,
  created_at
FROM user_sync_data
ORDER BY last_synced DESC
LIMIT 10;

-- 4. Check your posts
SELECT 
  id,
  author_id,
  content,
  created_at
FROM posts
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check support messages
SELECT 
  id,
  user_id,
  message,
  created_at
FROM support_messages
ORDER BY created_at DESC
LIMIT 10;
