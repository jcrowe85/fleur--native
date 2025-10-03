#!/bin/bash

# Check recent logs from the link-email edge function
# This will help us see the detailed debug output

echo "=== Checking Link-Email Edge Function Logs ==="
echo ""

# You'll need to run this command in your Supabase dashboard or CLI
echo "To check the logs, you can:"
echo ""
echo "1. Go to your Supabase Dashboard:"
echo "   https://supabase.com/dashboard/project/atnuvjxdtucwjiatnajt"
echo ""
echo "2. Navigate to: Edge Functions > link-email > Logs"
echo ""
echo "3. Look for recent logs with the debug output:"
echo "   - '=== LINK-EMAIL DEBUG START ==='"
echo "   - 'Environment check:'"
echo "   - 'User lookup result:'"
echo "   - 'UPDATE ERROR DETAILS:'"
echo ""
echo "4. Or use Supabase CLI (if installed):"
echo "   supabase functions logs link-email --project-ref atnuvjxdtucwjiatnajt"
echo ""
echo "The logs should show exactly where the updateUserById call is failing."
echo ""

# Let's also test the edge function directly to see if we can reproduce the error
echo "=== Testing Edge Function Directly ==="
echo ""

SUPABASE_URL="https://atnuvjxdtucwjiatnajt.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bnV2anhkdHVjd2ppYXRuYWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MDIyMjQsImV4cCI6MjA3MzQ3ODIyNH0.xFYlMCP_N-SGtR8UypQtxActX8tzmBts1nIXwAl3UaI"

# Create a guest user
echo "Creating guest user..."
GUEST_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/create-guest" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{}')

GUEST_EMAIL=$(echo "$GUEST_RESPONSE" | jq -r '.email')
GUEST_PASSWORD=$(echo "$GUEST_RESPONSE" | jq -r '.password')
echo "✓ Guest created: $GUEST_EMAIL"

# Sign in
echo "Signing in..."
SIGNIN_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -d "{\"email\":\"${GUEST_EMAIL}\",\"password\":\"${GUEST_PASSWORD}\"}")

ACCESS_TOKEN=$(echo "$SIGNIN_RESPONSE" | jq -r '.access_token')
USER_ID=$(echo "$SIGNIN_RESPONSE" | jq -r '.user.id')

echo "✓ Signed in. User ID: $USER_ID"

# Test link-email with a password that might cause issues
echo ""
echo "Testing link-email with potentially problematic password..."
TEST_EMAIL="test-error-$(date +%s)@example.com"
TEST_PASSWORD="short"  # This should trigger validation error

LINK_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST "${SUPABASE_URL}/functions/v1/link-email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")

HTTP_STATUS=$(echo "$LINK_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$LINK_RESPONSE" | grep -v "HTTP_STATUS:")

echo "Response status: $HTTP_STATUS"
echo "Response:"
echo "$RESPONSE_BODY" | jq '.'

echo ""
echo "=== Check the Supabase Dashboard logs for detailed debug output ==="
