-- Complete user data deletion script
-- Run this when a user requests account deletion

-- Replace 'USER_ID_HERE' with the actual user ID
-- Replace 'USER_EMAIL_HERE' with the actual email

-- 1. Delete personal profile data
DELETE FROM public.profiles WHERE id = 'USER_ID_HERE';

-- 2. Delete routine and personal data
DELETE FROM public.user_sync_data WHERE user_id = 'USER_ID_HERE';
DELETE FROM public.routine_steps WHERE user_id = 'USER_ID_HERE';
DELETE FROM public.points_ledger WHERE user_id = 'USER_ID_HERE';
DELETE FROM public.daily_checkins WHERE user_id = 'USER_ID_HERE';

-- 3. Delete community content (posts, comments)
DELETE FROM public.posts WHERE author_id = 'USER_ID_HERE';
DELETE FROM public.comments WHERE author_id = 'USER_ID_HERE';

-- 4. Delete support messages
DELETE FROM public.support_messages WHERE user_id = 'USER_ID_HERE';

-- 5. Delete auth user (requires admin privileges)
-- Note: This must be done via Supabase Dashboard or admin API
-- DELETE FROM auth.users WHERE id = 'USER_ID_HERE';

-- 6. Optional: Keep anonymized analytics data
-- INSERT INTO public.deleted_users_analytics (
--   user_id,
--   deleted_at,
--   total_points_earned,
--   routine_steps_completed,
--   days_active,
--   signup_date
-- ) VALUES (
--   'USER_ID_HERE',
--   NOW(),
--   (SELECT COALESCE(SUM(delta), 0) FROM public.points_ledger WHERE user_id = 'USER_ID_HERE' AND delta > 0),
--   (SELECT COUNT(*) FROM public.points_ledger WHERE user_id = 'USER_ID_HERE' AND reason = 'daily_routine_task'),
--   (SELECT COUNT(DISTINCT DATE(created_at)) FROM public.daily_checkins WHERE user_id = 'USER_ID_HERE'),
--   (SELECT created_at FROM auth.users WHERE id = 'USER_ID_HERE')
-- );
