-- Soft delete script - marks user as deleted but retains data
-- Use this for business analytics while respecting user privacy

-- Replace 'USER_ID_HERE' with the actual user ID

-- 1. Mark profile as deleted
UPDATE public.profiles 
SET 
  deleted_at = NOW(),
  email = NULL,
  display_name = 'Deleted User',
  handle = NULL,
  avatar_url = NULL
WHERE id = 'USER_ID_HERE';

-- 2. Anonymize community posts
UPDATE public.posts 
SET 
  content = '[Content deleted by user]',
  author_id = NULL
WHERE author_id = 'USER_ID_HERE';

-- 3. Anonymize comments
UPDATE public.comments 
SET 
  content = '[Comment deleted by user]',
  author_id = NULL
WHERE author_id = 'USER_ID_HERE';

-- 4. Keep routine data for analytics but remove personal identifiers
-- (Don't delete - just note that user requested deletion)

-- 5. Delete auth user (user can't log in anymore)
-- Note: This must be done via Supabase Dashboard or admin API
-- DELETE FROM auth.users WHERE id = 'USER_ID_HERE';

-- 6. Log the deletion for business purposes
INSERT INTO public.user_deletions (
  user_id,
  deleted_at,
  deletion_type,
  reason
) VALUES (
  'USER_ID_HERE',
  NOW(),
  'soft_delete',
  'user_requested'
);
