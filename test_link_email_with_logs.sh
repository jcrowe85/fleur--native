#!/bin/bash

# Test link-email function with detailed logging

SUPABASE_URL="https://atnuvjxdtucwjiatnajt.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bnV2anhkdHVjd2ppYXRuYWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MDIyMjQsImV4cCI6MjA3MzQ3ODIyNH0.xFYlMCP_N-SGtR8UypQtxActX8tzmBts1nIXwAl3UaI"

echo "=== Link-Email Debug Test with Logs ==="
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

# Step 3: Test link-email with detailed error reporting
echo ""
echo "Step 3: Testing link-email function with debug logs..."
NEW_EMAIL="debug-logs-$(date +%s)@example.com"
echo "Attempting to link: $NEW_EMAIL"

# Make the request with verbose output
echo "Making request to: ${SUPABASE_URL}/functions/v1/link-email"
echo "Headers: Authorization: Bearer [token], Content-Type: application/json"
echo "Body: {\"email\":\"${NEW_EMAIL}\",\"password\":\"debugpassword123\"}"
echo ""

LINK_RESPONSE=$(curl -v -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "${SUPABASE_URL}/functions/v1/link-email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{\"email\":\"${NEW_EMAIL}\",\"password\":\"debugpassword123\"}" 2>&1)

# Extract HTTP status
HTTP_STATUS=$(echo "$LINK_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$LINK_RESPONSE" | grep -v "HTTP_STATUS:" | grep -v ">" | grep -v "<" | grep -v "^$" | tail -n +10)

echo ""
echo "=== RESPONSE ANALYSIS ==="
echo "HTTP Status: $HTTP_STATUS"
echo ""
echo "Response Body:"
echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"

echo ""
echo "=== FULL CURL OUTPUT ==="
echo "$LINK_RESPONSE"

echo ""
echo "=== Test Complete ==="
echo ""
echo "📋 Next Steps:"
echo "1. Check the Supabase Edge Function logs for detailed debug output"
echo "2. Look for the '=== LINK-EMAIL DEBUG START ===' logs"
echo "3. Check for any error messages in the logs"
