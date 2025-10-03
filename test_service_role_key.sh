#!/bin/bash

# Test if the service role key is working properly

SUPABASE_URL="https://atnuvjxdtucwjiatnajt.supabase.co"

echo "=== Testing Service Role Key ==="
echo ""

# We can't test the service role key directly from here since it's in the edge function environment
# But we can check if the edge function can access it by looking at the logs

echo "The service role key issue can be identified by:"
echo ""
echo "1. Check Supabase Dashboard > Edge Functions > link-email > Logs"
echo "2. Look for the debug output:"
echo "   - 'Environment check:' should show hasServiceKey: true"
echo "   - If hasServiceKey: false, the SUPABASE_SERVICE_ROLE_KEY is missing"
echo ""
echo "3. Look for 'UPDATE ERROR DETAILS:' which will show the specific admin API error"
echo ""

# Common admin API errors and their meanings:
echo "=== Common Admin API Errors ==="
echo ""
echo "1. 'User not found' - Invalid user ID"
echo "2. 'Email already registered' - Email already exists in auth.users"
echo "3. 'Invalid email' - Email format issue"
echo "4. 'Password too weak' - Password doesn't meet requirements"
echo "5. 'Service role key invalid' - SUPABASE_SERVICE_ROLE_KEY is wrong/missing"
echo "6. 'Insufficient permissions' - Service role doesn't have admin access"
echo ""

# Let's test with a very specific scenario that should work
echo "=== Testing with Known Good Scenario ==="
echo ""

SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bnV2anhkdHVjd2ppYXRuYWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MDIyMjQsImV4cCI6MjA3MzQ3ODIyNH0.xFYlMCP_N-SGtR8UypQtxActX8tzmBts1nIXwAl3UaI"

# Create a fresh guest user
echo "Creating fresh guest user..."
GUEST_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/create-guest" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{}')

GUEST_EMAIL=$(echo "$GUEST_RESPONSE" | jq -r '.email')
GUEST_PASSWORD=$(echo "$GUEST_RESPONSE" | jq -r '.password')
echo "✓ Guest created: $GUEST_EMAIL"

# Sign in immediately
echo "Signing in..."
SIGNIN_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -d "{\"email\":\"${GUEST_EMAIL}\",\"password\":\"${GUEST_PASSWORD}\"}")

ACCESS_TOKEN=$(echo "$SIGNIN_RESPONSE" | jq -r '.access_token')
USER_ID=$(echo "$SIGNIN_RESPONSE" | jq -r '.user.id')

echo "✓ Signed in. User ID: $USER_ID"

# Immediately try to link email (before any potential token expiration)
echo "Immediately linking email..."
UNIQUE_EMAIL="fresh-test-$(date +%s)@example.com"
VALID_PASSWORD="validpassword123"

echo "Email: $UNIQUE_EMAIL"
echo "Password: $VALID_PASSWORD"

LINK_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "${SUPABASE_URL}/functions/v1/link-email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{\"email\":\"${UNIQUE_EMAIL}\",\"password\":\"${VALID_PASSWORD}\"}")

HTTP_STATUS=$(echo "$LINK_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$LINK_RESPONSE" | grep -v "HTTP_STATUS:")

echo ""
echo "=== RESULT ==="
echo "HTTP Status: $HTTP_STATUS"
echo "Response:"
echo "$RESPONSE_BODY" | jq '.'

if [ "$HTTP_STATUS" = "200" ]; then
  echo ""
  echo "✅ SUCCESS: The edge function works correctly!"
  echo "The issue in your app might be:"
  echo "1. Network connectivity issues"
  echo "2. Different environment variables"
  echo "3. Session timing issues"
  echo "4. App-specific configuration"
else
  echo ""
  echo "❌ FAILED: The edge function has an issue"
  echo "Check the Supabase Dashboard logs for detailed error information"
fi

echo ""
echo "=== Next Steps ==="
echo "1. Check Supabase Dashboard > Edge Functions > link-email > Logs"
echo "2. Look for the detailed debug output we added"
echo "3. Share the error details with me for further analysis"
