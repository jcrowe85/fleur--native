#!/bin/bash

# Detailed test of link-email function with database verification

SUPABASE_URL="https://atnuvjxdtucwjiatnajt.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bnV2anhkdHVjd2ppYXRuYWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MDIyMjQsImV4cCI6MjA3MzQ3ODIyNH0.xFYlMCP_N-SGtR8UypQtxActX8tzmBts1nIXwAl3UaI"

echo "=== Detailed Link-Email Test ==="
echo ""

# Step 1: Create guest user
echo "Step 1: Creating guest user..."
GUEST_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/create-guest" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{}')

GUEST_EMAIL=$(echo "$GUEST_RESPONSE" | jq -r '.email')
GUEST_PASSWORD=$(echo "$GUEST_RESPONSE" | jq -r '.password')
echo "✓ Guest created: $GUEST_EMAIL"
echo "✓ Password: $GUEST_PASSWORD"

# Step 2: Sign in
echo ""
echo "Step 2: Signing in..."
SIGNIN_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -d "{\"email\":\"${GUEST_EMAIL}\",\"password\":\"${GUEST_PASSWORD}\"}")

ACCESS_TOKEN=$(echo "$SIGNIN_RESPONSE" | jq -r '.access_token')
USER_ID=$(echo "$SIGNIN_RESPONSE" | jq -r '.user.id')

echo "✓ Signed in. User ID: $USER_ID"
echo "✓ Original email: $GUEST_EMAIL"

# Step 3: Check database BEFORE update
echo ""
echo "Step 3: Checking database BEFORE update..."
echo "SELECT id, email, updated_at FROM auth.users WHERE id = '$USER_ID';"
echo ""

# Step 4: Test link-email with verbose output
echo "Step 4: Testing link-email function..."
NEW_EMAIL="detailed-test-$(date +%s)@example.com"
echo "Attempting to link: $NEW_EMAIL"

LINK_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "${SUPABASE_URL}/functions/v1/link-email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{\"email\":\"${NEW_EMAIL}\",\"password\":\"newpassword123\"}")

# Split response and status
HTTP_STATUS=$(echo "$LINK_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$LINK_RESPONSE" | grep -v "HTTP_STATUS:")

echo ""
echo "HTTP Status: $HTTP_STATUS"
echo "Response:"
echo "$RESPONSE_BODY" | jq '.'

# Step 5: Check database AFTER update
echo ""
echo "Step 5: Checking database AFTER update..."
echo "SELECT id, email, updated_at FROM auth.users WHERE id = '$USER_ID';"
echo ""

# Step 6: Try to sign in with new credentials
echo "Step 6: Testing sign in with new credentials..."
NEW_SIGNIN_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -d "{\"email\":\"${NEW_EMAIL}\",\"password\":\"newpassword123\"}")

echo "New sign-in response:"
echo "$NEW_SIGNIN_RESPONSE" | jq '.'

# Check if new sign-in worked
NEW_ACCESS_TOKEN=$(echo "$NEW_SIGNIN_RESPONSE" | jq -r '.access_token')
if [ "$NEW_ACCESS_TOKEN" != "null" ] && [ "$NEW_ACCESS_TOKEN" != "" ]; then
  echo ""
  echo "✅ SUCCESS: New credentials work!"
  echo "✓ New email: $NEW_EMAIL"
  echo "✓ New password: newpassword123"
else
  echo ""
  echo "❌ FAILED: New credentials don't work"
  echo "Error: $(echo "$NEW_SIGNIN_RESPONSE" | jq -r '.error_description')"
fi

echo ""
echo "=== Test Complete ==="
