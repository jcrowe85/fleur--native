#!/bin/bash

# Test the exact flow that the app uses

SUPABASE_URL="https://atnuvjxdtucwjiatnajt.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bnV2anhkdHVjd2ppYXRuYWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MDIyMjQsImV4cCI6MjA3MzQ3ODIyNH0.xFYlMCP_N-SGtR8UypQtxActX8tzmBts1nIXwAl3UaI"

echo "=== App Sync Flow Test ==="
echo "This simulates the exact flow from ProfileScreen -> CloudSyncPopup"
echo ""

# Step 1: Create guest user (simulating app startup)
echo "Step 1: Creating guest user (app startup)..."
GUEST_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/create-guest" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{}')

GUEST_EMAIL=$(echo "$GUEST_RESPONSE" | jq -r '.email')
GUEST_PASSWORD=$(echo "$GUEST_RESPONSE" | jq -r '.password')
echo "✓ Guest created: $GUEST_EMAIL"

# Step 2: Sign in (simulating user opening the app)
echo ""
echo "Step 2: Signing in (user opens app)..."
SIGNIN_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -d "{\"email\":\"${GUEST_EMAIL}\",\"password\":\"${GUEST_PASSWORD}\"}")

ACCESS_TOKEN=$(echo "$SIGNIN_RESPONSE" | jq -r '.access_token')
USER_ID=$(echo "$SIGNIN_RESPONSE" | jq -r '.user.id')

echo "✓ Signed in. User ID: $USER_ID"

# Step 3: Get session (simulating CloudSyncPopup getting session)
echo ""
echo "Step 3: Getting session (CloudSyncPopup gets session)..."
SESSION_RESPONSE=$(curl -s -X GET "${SUPABASE_URL}/auth/v1/user" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

echo "Session check:"
echo "$SESSION_RESPONSE" | jq '{id: .id, email: .email, role: .app_metadata.role}'

# Step 4: Simulate CloudSyncPopup call (exact same as app)
echo ""
echo "Step 4: Simulating CloudSyncPopup call..."
NEW_EMAIL="app-test-$(date +%s)@example.com"
echo "Email to link: $NEW_EMAIL"
echo "Password: apppassword123"

# Use the exact same URL construction as the app
FUNCTIONS_URL="${SUPABASE_URL}/functions/v1"
echo "Functions URL: $FUNCTIONS_URL"

SYNC_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "${FUNCTIONS_URL}/link-email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{\"email\":\"${NEW_EMAIL}\",\"password\":\"apppassword123\"}")

HTTP_STATUS=$(echo "$SYNC_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$SYNC_RESPONSE" | grep -v "HTTP_STATUS:")

echo ""
echo "=== SYNC RESULT ==="
echo "HTTP Status: $HTTP_STATUS"
echo "Response:"
echo "$RESPONSE_BODY" | jq '.'

# Check if it was successful
SUCCESS=$(echo "$RESPONSE_BODY" | jq -r '.success')
ERROR_MSG=$(echo "$RESPONSE_BODY" | jq -r '.error // .message')

if [ "$SUCCESS" = "true" ]; then
  echo ""
  echo "✅ SUCCESS: Email linked successfully!"
  echo "✓ New email: $NEW_EMAIL"
  echo "✓ Password: apppassword123"
  
  # Test sign in with new credentials
  echo ""
  echo "Step 5: Testing sign in with new credentials..."
  NEW_SIGNIN_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
    -H "Content-Type: application/json" \
    -H "apikey: ${SUPABASE_ANON_KEY}" \
    -d "{\"email\":\"${NEW_EMAIL}\",\"password\":\"apppassword123\"}")
  
  NEW_ACCESS_TOKEN=$(echo "$NEW_SIGNIN_RESPONSE" | jq -r '.access_token')
  if [ "$NEW_ACCESS_TOKEN" != "null" ] && [ "$NEW_ACCESS_TOKEN" != "" ]; then
    echo "✅ New credentials work perfectly!"
  else
    echo "❌ New credentials don't work"
  fi
else
  echo ""
  echo "❌ FAILED: $ERROR_MSG"
fi

echo ""
echo "=== Test Complete ==="
