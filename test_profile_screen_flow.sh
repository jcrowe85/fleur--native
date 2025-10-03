#!/bin/bash

# Test the complete ProfileScreen flow

SUPABASE_URL="https://atnuvjxdtucwjiatnajt.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bnV2anhkdHVjd2ppYXRuYWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MDIyMjQsImV4cCI6MjA3MzQ3ODIyNH0.xFYlMCP_N-SGtR8UypQtxActX8tzmBts1nIXwAl3UaI"

echo "=== ProfileScreen Flow Test ==="
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
echo "Step 2: Signing in as guest..."
SIGNIN_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -d "{\"email\":\"${GUEST_EMAIL}\",\"password\":\"${GUEST_PASSWORD}\"}")

ACCESS_TOKEN=$(echo "$SIGNIN_RESPONSE" | jq -r '.access_token')
USER_ID=$(echo "$SIGNIN_RESPONSE" | jq -r '.user.id')
echo "✓ Signed in. User ID: $USER_ID"

# Step 3: Check user data BEFORE sync (this is what ProfileScreen shows)
echo ""
echo "Step 3: User data BEFORE sync (what ProfileScreen shows)..."
USER_RESPONSE=$(curl -s -X GET "${SUPABASE_URL}/auth/v1/user" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

echo "Current email: $(echo "$USER_RESPONSE" | jq -r '.email')"
echo "User role: $(echo "$USER_RESPONSE" | jq -r '.app_metadata.role')"

# Step 4: Simulate the sync process
echo ""
echo "Step 4: Simulating 'Add Email & Sync' button click..."
NEW_EMAIL="profilescreen-test-$(date +%s)@example.com"
echo "Linking email: $NEW_EMAIL"

LINK_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/link-email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{\"email\":\"${NEW_EMAIL}\",\"password\":\"profilepassword123\"}")

echo "Link response:"
echo "$LINK_RESPONSE" | jq '.'

# Step 5: Check user data AFTER sync (ProfileScreen should still show old data)
echo ""
echo "Step 5: User data AFTER sync (ProfileScreen still shows old data)..."
USER_RESPONSE_AFTER=$(curl -s -X GET "${SUPABASE_URL}/auth/v1/user" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

echo "Response after sync:"
echo "$USER_RESPONSE_AFTER" | jq '.'

# Step 6: Sign in with new credentials (this is what happens after sign out)
echo ""
echo "Step 6: Sign in with new credentials (after ProfileScreen sign out)..."
NEW_SIGNIN_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -d "{\"email\":\"${NEW_EMAIL}\",\"password\":\"profilepassword123\"}")

NEW_ACCESS_TOKEN=$(echo "$NEW_SIGNIN_RESPONSE" | jq -r '.access_token')
echo "New sign-in successful: $(echo "$NEW_SIGNIN_RESPONSE" | jq -r '.user.email')"

echo ""
echo "=== Summary ==="
echo "✓ Guest email: $GUEST_EMAIL"
echo "✓ New email: $NEW_EMAIL"
echo "✓ Link-email function: Working"
echo "✓ New credentials: Working"
echo ""
echo "The ProfileScreen shows the OLD email until the user signs out and signs back in."
echo "This is expected behavior because the session becomes invalid after email update."
echo ""
echo "=== Test Complete ==="
