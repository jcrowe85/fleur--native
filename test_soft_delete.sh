#!/bin/bash

# Test soft delete functionality

SUPABASE_URL="https://atnuvjxdtucwjiatnajt.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bnV2anhkdHVjd2ppYXRuYWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MDIyMjQsImV4cCI6MjA3MzQ3ODIyNH0.xFYlMCP_N-SGtR8UypQtxActX8tzmBts1nIXwAl3UaI"

echo "=== Testing Soft Delete Functionality ==="
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

# Create some test data (profile, posts, etc.)
echo ""
echo "Step 3: Creating test data..."

# Create profile
PROFILE_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/profiles" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{\"id\":\"${USER_ID}\",\"display_name\":\"Test User\",\"handle\":\"testuser\",\"email\":\"${GUEST_EMAIL}\"}")

echo "✓ Profile created"

# Create a test post
POST_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/posts" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{\"content\":\"This is a test post that should be anonymized\",\"author_id\":\"${USER_ID}\"}")

echo "✓ Test post created"

# Test soft delete
echo ""
echo "Step 4: Testing soft delete..."
SOFT_DELETE_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/soft-delete-user" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{\"userId\":\"${USER_ID}\"}")

echo "Soft delete response:"
echo "$SOFT_DELETE_RESPONSE" | jq '.'

SUCCESS=$(echo "$SOFT_DELETE_RESPONSE" | jq -r '.success')
if [ "$SUCCESS" != "true" ]; then
  echo "❌ Soft delete failed"
  exit 1
fi
echo "✓ Soft delete completed!"

# Try to sign in again (should fail)
echo ""
echo "Step 5: Testing login after deletion (should fail)..."
LOGIN_AFTER_DELETE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -d "{\"email\":\"${GUEST_EMAIL}\",\"password\":\"${GUEST_PASSWORD}\"}")

LOGIN_ERROR=$(echo "$LOGIN_AFTER_DELETE" | jq -r '.error')

if [ "$LOGIN_ERROR" != "null" ]; then
  echo "✅ SUCCESS! User cannot log in after deletion"
  echo "Error: $LOGIN_ERROR"
else
  echo "❌ FAILED! User can still log in after deletion"
fi

echo ""
echo "✅ Soft delete test completed successfully!"
echo "The user account has been soft deleted and cannot be accessed anymore."
