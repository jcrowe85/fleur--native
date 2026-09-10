#!/bin/bash

# Script to check user data in Supabase

SUPABASE_URL="https://atnuvjxdtucwjiatnajt.supabase.co"
SUPABASE_SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:?set SUPABASE_SERVICE_ROLE_KEY in your environment}"

echo "=== YOUR USER DATA LOCATION GUIDE ==="
echo ""

echo "📧 EMAIL & PROFILE DATA:"
echo "Table: auth.users (Supabase Auth table)"
echo "Table: profiles (Your profile info)"
echo ""

# Get recent users with real emails (not guest)
echo "Recent users with linked emails:"
curl -s "${SUPABASE_URL}/rest/v1/rpc/get_auth_users" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" 2>/dev/null || echo "Note: Need to create RPC function to query auth.users"

echo ""
echo "Checking profiles table:"
PROFILES=$(curl -s "${SUPABASE_URL}/rest/v1/profiles?select=id,email,avatar_url,handle,display_name,created_at&order=created_at.desc&limit=5" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}")

echo "$PROFILES" | jq -r '.[] | "User ID: \(.id) | Email: \(.email // "none") | Handle: \(.handle // "none") | Created: \(.created_at)"'

echo ""
echo "💾 CLOUD SYNC DATA (routine, points, progress):"
echo "Table: user_sync_data"
echo ""

SYNC_DATA=$(curl -s "${SUPABASE_URL}/rest/v1/user_sync_data?select=user_id,email,last_synced&order=last_synced.desc&limit=5" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}")

echo "Recent synced users:"
echo "$SYNC_DATA" | jq -r '.[] | "User ID: \(.user_id) | Email: \(.email) | Last Synced: \(.last_synced)"'

echo ""
echo "📝 COMMUNITY POSTS:"
echo "Table: posts"
echo ""

POSTS=$(curl -s "${SUPABASE_URL}/rest/v1/posts?select=id,author_id,content,created_at&order=created_at.desc&limit=3" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}")

if [ "$(echo "$POSTS" | jq '. | length')" -gt 0 ]; then
  echo "Recent posts:"
  echo "$POSTS" | jq -r '.[] | "Post ID: \(.id) | Author: \(.author_id) | Content: \(.content[0:50])..."'
else
  echo "No posts found in database"
fi

echo ""
echo "💬 SUPPORT MESSAGES:"
echo "Table: support_messages"
echo ""

MESSAGES=$(curl -s "${SUPABASE_URL}/rest/v1/support_messages?select=id,user_id,message,created_at&order=created_at.desc&limit=3" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}")

if [ "$(echo "$MESSAGES" | jq '. | length')" -gt 0 ]; then
  echo "Recent support messages:"
  echo "$MESSAGES" | jq -r '.[] | "Message ID: \(.id) | User: \(.user_id) | Message: \(.message[0:50])..."'
else
  echo "No support messages found"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📊 DATA STORAGE SUMMARY:"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "✅ auth.users table      → Email, password, auth metadata"
echo "✅ profiles table        → Avatar, handle, display_name, email"
echo "✅ user_sync_data table  → Routine, points, rewards, cart, purchases"
echo "✅ posts table           → Community posts"
echo "✅ comments table        → Post comments"
echo "✅ likes table           → Post/comment likes"
echo "✅ support_messages      → Help & support chat"
echo ""
echo "Note: Most app data (routine, points) is stored in user_sync_data.routine_data"
echo "      and user_sync_data.rewards_data as JSONB columns"

