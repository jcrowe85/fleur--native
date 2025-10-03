#!/bin/bash

# Script to delete a user account from Supabase
# Usage: ./delete_user_account.sh your-email@example.com

if [ $# -eq 0 ]; then
    echo "Usage: $0 <email-address>"
    echo "Example: $0 user@example.com"
    exit 1
fi

EMAIL="$1"
SUPABASE_URL="https://atnuvjxdtucwjiatnajt.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bnV2anhkdHVjd2ppYXRuYWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MDIyMjQsImV4cCI6MjA3MzQ3ODIyNH0.xFYlMCP_N-SGtR8UypQtxActX8tzmBts1nIXwAl3UaI"

echo "⚠️  WARNING: This will permanently delete the user account for: $EMAIL"
echo "This action cannot be undone!"
echo ""
read -p "Are you sure you want to delete this account? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Account deletion cancelled."
    exit 0
fi

echo ""
echo "🔍 Looking up user account..."

# First, try to find the user
USER_LOOKUP=$(curl -s -X GET "${SUPABASE_URL}/auth/v1/admin/users?email=${EMAIL}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}")

USER_ID=$(echo "$USER_LOOKUP" | jq -r '.users[0].id // empty')

if [ -z "$USER_ID" ]; then
    echo "❌ User not found with email: $EMAIL"
    echo "Response: $USER_LOOKUP"
    exit 1
fi

echo "✓ Found user ID: $USER_ID"

# Delete from profiles table first
echo ""
echo "🗑️  Deleting from profiles table..."
PROFILE_DELETE=$(curl -s -X DELETE "${SUPABASE_URL}/rest/v1/profiles?id=eq.${USER_ID}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json")

echo "Profile deletion response: $PROFILE_DELETE"

# Delete from auth.users (this requires admin privileges)
echo ""
echo "🗑️  Deleting from auth.users..."
echo "⚠️  Note: This requires admin API key. You may need to do this manually in the Supabase Dashboard."

# Note: The admin API requires the service role key, not the anon key
# For security reasons, we won't include the service role key in this script
echo ""
echo "📋 Manual steps required:"
echo "1. Go to Supabase Dashboard → Authentication → Users"
echo "2. Find user: $EMAIL (ID: $USER_ID)"
echo "3. Click the three dots → Delete user"
echo ""
echo "Or run this SQL in the SQL Editor:"
echo "DELETE FROM auth.users WHERE id = '$USER_ID';"
echo "DELETE FROM public.profiles WHERE id = '$USER_ID';"

echo ""
echo "✅ Script completed. Follow the manual steps above to complete the deletion."
