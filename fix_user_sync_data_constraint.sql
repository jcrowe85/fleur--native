-- Fix user_sync_data table to add unique constraint on user_id
-- This allows the cloudSyncService to use onConflict: 'user_id' properly

-- Add unique constraint on user_id
ALTER TABLE "public"."user_sync_data" 
ADD CONSTRAINT "user_sync_data_user_id_unique" UNIQUE ("user_id");

-- Verify the constraint was added
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.user_sync_data'::regclass 
AND conname = 'user_sync_data_user_id_unique';
