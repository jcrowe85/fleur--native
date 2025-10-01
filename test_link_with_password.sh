#!/bin/bash

# Test linking email WITH password

SUPABASE_URL="https://atnuvjxdtucwjiatnajt.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bnV2anhkdHVjd2ppYXRuYWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MDIyMjQsImV4cCI6MjA3MzQ3ODIyNH0.xFYlMCP_N-SGtR8UypQtxActX8tzmBts1nIXwAl3UaI"

echo "=== Testing Email Link with Password ==="
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

# Link email with password
echo ""
echo "Step 3: Linking email with password..."
NEW_EMAIL="link-pwd-$(date +%s)@example.com"
NEW_PASSWORD="SecurePass123!"
echo "Email: $NEW_EMAIL"
echo "Password: $NEW_PASSWORD"

LINK_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/link-email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{\"email\":\"${NEW_EMAIL}\",\"password\":\"${NEW_PASSWORD}\"}")

echo "Link response:"
echo "$LINK_RESPONSE" | jq '.'

SUCCESS=$(echo "$LINK_RESPONSE" | jq -r '.success')
if [ "$SUCCESS" != "true" ]; then
  echo "❌ Failed to link email"
  exit 1
fi
echo "✓ Email and password linked!"

# Sign out
echo ""
echo "Step 4: Signing out..."
SIGNOUT=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/logout" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")
echo "✓ Signed out"

# Try to sign in with new email and password
echo ""
echo "Step 5: Testing login with new email and password..."
LOGIN_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -d "{\"email\":\"${NEW_EMAIL}\",\"password\":\"${NEW_PASSWORD}\"}")

NEW_ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token')
LOGIN_ERROR=$(echo "$LOGIN_RESPONSE" | jq -r '.error')

if [ "$NEW_ACCESS_TOKEN" != "null" ] && [ -n "$NEW_ACCESS_TOKEN" ]; then
  echo "✅ SUCCESS! Can log in with new email and password"
  echo "Access token: ${NEW_ACCESS_TOKEN:0:30}..."
  echo ""
  echo "Logged in user:"
  echo "$LOGIN_RESPONSE" | jq '.user | {id, email}'
else
  echo "❌ FAILED to log in"
  echo "Error: $LOGIN_ERROR"
  echo "Full response:"
  echo "$LOGIN_RESPONSE" | jq '.'
fi

