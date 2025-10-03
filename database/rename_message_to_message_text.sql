-- Rename the 'message' column to 'message_text' in support_messages table
-- This will fix the slackService.ts error

-- Step 1: Rename the column
ALTER TABLE support_messages 
RENAME COLUMN message TO message_text;

-- Step 2: Verify the change worked
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'support_messages' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 3: Refresh the schema cache so the API recognizes the change
NOTIFY pgrst, 'reload schema';

-- Step 4: Confirm the fix
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_messages' AND column_name = 'message_text') 
        THEN '✅ SUCCESS: message_text column now exists'
        ELSE '❌ FAILED: message_text column still missing'
    END as rename_status;
