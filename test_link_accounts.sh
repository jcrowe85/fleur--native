#!/bin/bash

# Test script for linking guest account to real email
# Approach: Create new user with real email, then migrate data

SUPABASE_URL="https://atnuvjxdtucwjiatnajt.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bnV2anhkdHVjd2ppYXRuYWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MDIyMjQsImV4cCI6MjA3MzQ3ODIyNH0.xFYlMCP_N-SGtR8UypQtxActX8tzmBts1nIXwAl3UaI"
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bnV2anhkdHVjd2ppYXRuYWp0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzkwMjIyNCwiZXhwIjoyMDczNDc4MjI0fQ.HxX62EK0HL9a2lTIo2bAhKAcH6IOdxJHr7zuWV0NhP4"

echo "=== Test 1: Create a guest user ==="
GUEST_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/create-guest" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{}')

GUEST_EMAIL=$(echo "$GUEST_RESPONSE" | jq -r '.email')
GUEST_PASSWORD=$(echo "$GUEST_RESPONSE" | jq -r '.password')
echo "Guest email: $GUEST_EMAIL"

echo ""
echo "=== Test 2: Sign in as guest ==="
SIGNIN_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -d "{\"email\":\"${GUEST_EMAIL}\",\"password\":\"${GUEST_PASSWORD}\"}")

GUEST_USER_ID=$(echo "$SIGNIN_RESPONSE" | jq -r '.user.id')
ACCESS_TOKEN=$(echo "$SIGNIN_RESPONSE" | jq -r '.access_token')
echo "Guest user ID: $GUEST_USER_ID"

echo ""
echo "=== Test 3: Try updating email directly with service role key ==="
NEW_EMAIL="test-link-$(date +%s)@example.com"
echo "Attempting to update guest user to: $NEW_EMAIL"

# Use admin API to update user email
ADMIN_UPDATE=$(curl -s -X PUT "${SUPABASE_URL}/auth/v1/admin/users/${GUEST_USER_ID}" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -d "{\"email\":\"${NEW_EMAIL}\",\"email_confirm\":true}")

echo "Admin update response:"
echo "$ADMIN_UPDATE" | jq '.'

ERROR=$(echo "$ADMIN_UPDATE" | jq -r '.code')
if [ "$ERROR" != "null" ] && [ -n "$ERROR" ]; then
  echo "❌ Admin update failed"
  echo "Error: $(echo "$ADMIN_UPDATE" | jq -r '.msg')"
else
  echo "✓ Email updated successfully via admin API!"
  echo "New email: $(echo "$ADMIN_UPDATE" | jq -r '.email')"
fi

