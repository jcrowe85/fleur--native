#!/bin/bash

# Test post deletion functionality

SUPABASE_URL="https://atnuvjxdtucwjiatnajt.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bnV2anhkdHVjd2ppYXRuYWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MDIyMjQsImV4cCI6MjA3MzQ3ODIyNH0.xFYlMCP_N-SGtR8UypQtxActX8tzmBts1nIXwAl3UaI"

echo "=== Testing Post Deletion Functionality ==="
echo ""

# Create guest
echo "Step 1: Creating guest user..."
GUEST_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/create-guest" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{}')

GUEST_EMAIL=$(echo "$GUEST_RESPONSE" | jq -r '.email')
GUEST_PASSWORD=$(echo "$GUEST_RESPONSE" | jq -r '.password')
echo "✓ Guest: $GUEST_EMAIL"

# Sign in as guest
echo ""
echo "Step 2: Signing in as guest..."
SIGNIN_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -d "{\"email\":\"${GUEST_EMAIL}\",\"password\":\"${GUEST_PASSWORD}\"}")

ACCESS_TOKEN=$(echo "$SIGNIN_RESPONSE" | jq -r '.access_token')
USER_ID=$(echo "$SIGNIN_RESPONSE" | jq -r '.user.id')
echo "✓ User ID: $USER_ID"

# Create a test profile
echo ""
echo "Step 3: Creating profile..."
PROFILE_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/profiles" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{\"id\":\"${USER_ID}\",\"display_name\":\"Test User\",\"handle\":\"testuser\",\"email\":\"${GUEST_EMAIL}\"}")

echo "✓ Profile created"

# Create a test post
echo ""
echo "Step 4: Creating test post..."
POST_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/posts" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{\"body\":\"This is a test post that will be deleted\",\"category\":\"tips_tricks\",\"user_id\":\"${USER_ID}\"}")

echo "Post creation response:"
echo "$POST_RESPONSE" | jq '.'

POST_ID=$(echo "$POST_RESPONSE" | jq -r '.id')
echo "✓ Post created with ID: $POST_ID"

# Verify post exists
echo ""
echo "Step 5: Verifying post exists..."
VERIFY_RESPONSE=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/posts?id=eq.${POST_ID}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  | jq 'length')

if [ "$VERIFY_RESPONSE" = "1" ]; then
  echo "✓ Post exists in database"
else
  echo "❌ Post not found"
  exit 1
fi

# Delete the post
echo ""
echo "Step 6: Deleting the post..."
DELETE_RESPONSE=$(curl -s -X DELETE "${SUPABASE_URL}/rest/v1/posts?id=eq.${POST_ID}&user_id=eq.${USER_ID}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

echo "✓ Delete request sent"

# Verify post is deleted
echo ""
echo "Step 7: Verifying post is deleted..."
VERIFY_DELETE_RESPONSE=$(curl -s -X GET "${SUPABASE_URL}/rest/v1/posts?id=eq.${POST_ID}" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  | jq 'length')

if [ "$VERIFY_DELETE_RESPONSE" = "0" ]; then
  echo "✅ SUCCESS! Post has been deleted from database"
else
  echo "❌ FAILED! Post still exists in database"
  echo "Response: $VERIFY_DELETE_RESPONSE"
fi

echo ""
echo "✅ Post deletion test completed!"
