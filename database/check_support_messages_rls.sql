-- Check RLS permissions on support_messages table
-- This will show you exactly what policies exist and what they allow

-- 1. Check if RLS is enabled on the table
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'support_messages';

-- 2. List all RLS policies on support_messages
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual as condition,
    with_check as insert_condition
FROM pg_policies 
WHERE tablename = 'support_messages'
ORDER BY policyname;

-- 3. Check what roles/permissions exist
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges 
WHERE table_name = 'support_messages'
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

-- 4. Test current user permissions
SELECT 
    current_user as current_role,
    session_user as session_role,
    current_setting('role') as current_setting_role;

-- 5. Check if service_role has access
-- (This is what the webhook should be using)
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_privileges 
            WHERE table_name = 'support_messages' 
            AND grantee = 'service_role'
            AND privilege_type = 'INSERT'
        ) THEN '✅ service_role has INSERT permission'
        ELSE '❌ service_role missing INSERT permission'
    END as service_role_insert_check,
    
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_privileges 
            WHERE table_name = 'support_messages' 
            AND grantee = 'service_role'
            AND privilege_type = 'SELECT'
        ) THEN '✅ service_role has SELECT permission'
        ELSE '❌ service_role missing SELECT permission'
    END as service_role_select_check;

-- 6. Check for any restrictive RLS conditions
-- Look for policies that might block webhook inserts
SELECT 
    policyname,
    cmd,
    qual,
    with_check,
    CASE 
        WHEN qual LIKE '%auth.uid()%' AND cmd = 'INSERT' THEN '⚠️  INSERT policy requires user auth - may block webhook'
        WHEN with_check LIKE '%auth.uid()%' AND cmd = 'INSERT' THEN '⚠️  INSERT policy requires user auth - may block webhook'
        WHEN cmd = 'INSERT' AND (qual IS NULL OR qual = '') AND (with_check IS NULL OR with_check = '') THEN '✅ Unrestricted INSERT policy'
        ELSE 'ℹ️  Other policy condition'
    END as policy_analysis
FROM pg_policies 
WHERE tablename = 'support_messages'
AND cmd IN ('INSERT', 'ALL');
