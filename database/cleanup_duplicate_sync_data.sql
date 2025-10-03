-- Clean up duplicate rows in user_sync_data table
-- Keep the most recent entry for each user_id

-- First, let's see what duplicates we have
SELECT 
    user_id,
    email,
    COUNT(*) as duplicate_count,
    MIN(created_at) as earliest,
    MAX(created_at) as latest
FROM user_sync_data 
GROUP BY user_id, email
HAVING COUNT(*) > 1;

-- Delete older duplicate entries, keeping only the most recent one
WITH ranked_data AS (
  SELECT 
    id,
    user_id,
    email,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, email 
      ORDER BY created_at DESC
    ) as rn
  FROM user_sync_data
)
DELETE FROM user_sync_data 
WHERE id IN (
  SELECT id 
  FROM ranked_data 
  WHERE rn > 1
);

-- Verify cleanup
SELECT 
    user_id,
    email,
    COUNT(*) as remaining_count
FROM user_sync_data 
GROUP BY user_id, email
ORDER BY user_id;
