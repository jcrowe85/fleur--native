#!/bin/bash

# Test to identify the specific admin API issue

SUPABASE_URL="https://atnuvjxdtucwjiatnajt.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bnV2anhkdHVjd2ppYXRuYWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MDIyMjQsImV4cCI6MjA3MzQ3ODIyNH0.xFYlMCP_N-SGtR8UypQtxActX8tzmBts1nIXwAl3UaI"

echo "=== Testing Admin API Issues ==="
echo ""

# Create a guest user
echo "Step 1: Creating guest user..."
GUEST_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/create-guest" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{}')

GUEST_EMAIL=$(echo "$GUEST_RESPONSE" | jq -r '.email')
GUEST_PASSWORD=$(echo "$GUEST_RESPONSE" | jq -r '.password')
echo "✓ Guest created: $GUEST_EMAIL"

# Sign in
echo ""
echo "Step 2: Signing in..."
SIGNIN_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -d "{\"email\":\"${GUEST_EMAIL}\",\"password\":\"${GUEST_PASSWORD}\"}")

ACCESS_TOKEN=$(echo "$SIGNIN_RESPONSE" | jq -r '.access_token')
USER_ID=$(echo "$SIGNIN_RESPONSE" | jq -r '.user.id')

echo "✓ Signed in. User ID: $USER_ID"

# Test with a valid email that might already exist
echo ""
echo "Step 3: Testing with email that might already exist..."
TEST_EMAIL="test@example.com"  # Common email that might exist
TEST_PASSWORD="validpassword123"

echo "Testing with: $TEST_EMAIL"

LINK_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "${SUPABASE_URL}/functions/v1/link-email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")

HTTP_STATUS=$(echo "$LINK_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$LINK_RESPONSE" | grep -v "HTTP_STATUS:")

echo "Response status: $HTTP_STATUS"
echo "Response:"
echo "$RESPONSE_BODY" | jq '.'

# Test with a unique email
echo ""
echo "Step 4: Testing with unique email..."
UNIQUE_EMAIL="unique-test-$(date +%s)@example.com"
echo "Testing with: $UNIQUE_EMAIL"

LINK_RESPONSE2=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "${SUPABASE_URL}/functions/v1/link-email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{\"email\":\"${UNIQUE_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")

HTTP_STATUS2=$(echo "$LINK_RESPONSE2" | grep "HTTP_STATUS:" | cut -d: -f2)
RESPONSE_BODY2=$(echo "$LINK_RESPONSE2" | grep -v "HTTP_STATUS:")

echo "Response status: $HTTP_STATUS2"
echo "Response:"
echo "$RESPONSE_BODY2" | jq '.'

echo ""
echo "=== Analysis ==="
if [ "$HTTP_STATUS" = "400" ] && [ "$HTTP_STATUS2" = "400" ]; then
  echo "Both requests failed with 400 - likely a systematic issue"
  echo "Check Supabase Dashboard logs for detailed error messages"
elif [ "$HTTP_STATUS" = "400" ] && [ "$HTTP_STATUS2" = "200" ]; then
  echo "First request failed, second succeeded - likely email already exists"
  echo "The error is probably: 'User already registered'"
elif [ "$HTTP_STATUS" = "200" ] && [ "$HTTP_STATUS2" = "200" ]; then
  echo "Both requests succeeded - issue might be intermittent"
else
  echo "Mixed results - check logs for specific error details"
fi

echo ""
echo "Next steps:"
echo "1. Check Supabase Dashboard logs for detailed error messages"
echo "2. Look for 'UPDATE ERROR DETAILS:' in the logs"
echo "3. Common errors: 'User already registered', 'Invalid user ID', 'Service role key issue'"
