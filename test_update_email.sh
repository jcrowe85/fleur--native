#!/bin/bash

# Test script for updating guest user email in Supabase

SUPABASE_URL="https://atnuvjxdtucwjiatnajt.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bnV2anhkdHVjd2ppYXRuYWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MDIyMjQsImV4cCI6MjA3MzQ3ODIyNH0.xFYlMCP_N-SGtR8UypQtxActX8tzmBts1nIXwAl3UaI"

echo "=== Test 1: Create a guest user via Edge Function ==="
GUEST_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/create-guest" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{}')

echo "Guest user response:"
echo "$GUEST_RESPONSE" | jq '.'

# Extract email and password from response
GUEST_EMAIL=$(echo "$GUEST_RESPONSE" | jq -r '.email')
GUEST_PASSWORD=$(echo "$GUEST_RESPONSE" | jq -r '.password')

if [ "$GUEST_EMAIL" == "null" ] || [ -z "$GUEST_EMAIL" ]; then
  echo "❌ Failed to create guest user"
  exit 1
fi

echo ""
echo "Guest email: $GUEST_EMAIL"
echo "Guest password: $GUEST_PASSWORD"

echo ""
echo "=== Test 2: Sign in as guest user ==="
SIGNIN_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -d "{\"email\":\"${GUEST_EMAIL}\",\"password\":\"${GUEST_PASSWORD}\"}")

echo "Sign in response:"
echo "$SIGNIN_RESPONSE" | jq '.'

# Extract access token
ACCESS_TOKEN=$(echo "$SIGNIN_RESPONSE" | jq -r '.access_token')

if [ "$ACCESS_TOKEN" == "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Failed to sign in"
  exit 1
fi

echo ""
echo "✓ Signed in successfully"
echo "Access token: ${ACCESS_TOKEN:0:20}..."

echo ""
echo "=== Test 3: Try to update email to a real email ==="
NEW_EMAIL="test-$(date +%s)@example.com"
echo "Attempting to update to: $NEW_EMAIL"

UPDATE_RESPONSE=$(curl -s -X PUT "${SUPABASE_URL}/auth/v1/user" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{\"email\":\"${NEW_EMAIL}\"}")

echo "Update response:"
echo "$UPDATE_RESPONSE" | jq '.'

# Check if there's an error
ERROR=$(echo "$UPDATE_RESPONSE" | jq -r '.error')
if [ "$ERROR" != "null" ] && [ -n "$ERROR" ]; then
  echo ""
  echo "❌ Update failed with error:"
  echo "$UPDATE_RESPONSE" | jq '.error'
  echo ""
  echo "Error message: $(echo "$UPDATE_RESPONSE" | jq -r '.error_description // .message')"
else
  echo ""
  echo "✓ Email update successful!"
  echo "New email: $(echo "$UPDATE_RESPONSE" | jq -r '.email')"
fi

echo ""
echo "=== Test 4: Check user session after update ==="
SESSION_RESPONSE=$(curl -s -X GET "${SUPABASE_URL}/auth/v1/user" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

echo "Current user session:"
echo "$SESSION_RESPONSE" | jq '.'

