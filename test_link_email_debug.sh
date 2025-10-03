#!/bin/bash

# Debug the link-email edge function

SUPABASE_URL="https://atnuvjxdtucwjiatnajt.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bnV2anhkdHVjd2ppYXRuYWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MDIyMjQsImV4cCI6MjA3MzQ3ODIyNH0.xFYlMCP_N-SGtR8UypQtxActX8tzmBts1nIXwAl3UaI"

echo "=== Debug Link-Email Edge Function ==="
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
echo "✓ Access token: ${ACCESS_TOKEN:0:20}..."

# Step 3: Check current user details
echo ""
echo "Step 3: Checking current user details..."
USER_RESPONSE=$(curl -s -X GET "${SUPABASE_URL}/auth/v1/user" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

echo "Current user:"
echo "$USER_RESPONSE" | jq '.'

# Step 4: Test link-email with detailed error reporting
echo ""
echo "Step 4: Testing link-email function..."
NEW_EMAIL="debug-test-$(date +%s)@example.com"
echo "Attempting to link: $NEW_EMAIL"

LINK_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "${SUPABASE_URL}/functions/v1/link-email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{\"email\":\"${NEW_EMAIL}\",\"password\":\"debugpassword123\"}")

# Split response and status
HTTP_STATUS=$(echo "$LINK_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$LINK_RESPONSE" | grep -v "HTTP_STATUS:")

echo ""
echo "HTTP Status: $HTTP_STATUS"
echo "Response:"
echo "$RESPONSE_BODY" | jq '.'

# Step 5: Check if user was updated
if [ "$HTTP_STATUS" = "200" ]; then
  echo ""
  echo "Step 5: Verifying user update..."
  UPDATED_USER_RESPONSE=$(curl -s -X GET "${SUPABASE_URL}/auth/v1/user" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}")
  
  echo "Updated user:"
  echo "$UPDATED_USER_RESPONSE" | jq '.'
else
  echo ""
  echo "❌ Link-email failed with status: $HTTP_STATUS"
fi

echo ""
echo "=== Debug Complete ==="
