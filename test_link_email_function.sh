#!/bin/bash

# Test the link-email Edge Function

SUPABASE_URL="https://atnuvjxdtucwjiatnajt.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bnV2anhkdHVjd2ppYXRuYWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MDIyMjQsImV4cCI6MjA3MzQ3ODIyNH0.xFYlMCP_N-SGtR8UypQtxActX8tzmBts1nIXwAl3UaI"

echo "=== Step 1: Create guest user ==="
GUEST_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/create-guest" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -d '{}')

GUEST_EMAIL=$(echo "$GUEST_RESPONSE" | jq -r '.email')
GUEST_PASSWORD=$(echo "$GUEST_RESPONSE" | jq -r '.password')
echo "Created guest: $GUEST_EMAIL"

echo ""
echo "=== Step 2: Sign in as guest ==="
SIGNIN_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -d "{\"email\":\"${GUEST_EMAIL}\",\"password\":\"${GUEST_PASSWORD}\"}")

ACCESS_TOKEN=$(echo "$SIGNIN_RESPONSE" | jq -r '.access_token')
USER_ID=$(echo "$SIGNIN_RESPONSE" | jq -r '.user.id')
echo "Signed in successfully. User ID: $USER_ID"

echo ""
echo "=== Step 3: Link email using Edge Function ==="
NEW_EMAIL="real-user-$(date +%s)@example.com"
echo "Linking to: $NEW_EMAIL"

LINK_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/link-email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{\"email\":\"${NEW_EMAIL}\"}")

echo "Link response:"
echo "$LINK_RESPONSE" | jq '.'

SUCCESS=$(echo "$LINK_RESPONSE" | jq -r '.success')
if [ "$SUCCESS" == "true" ]; then
  echo ""
  echo "✅ SUCCESS! Email linked successfully"
  echo "New email: $(echo "$LINK_RESPONSE" | jq -r '.user.email')"
else
  echo ""
  echo "❌ FAILED to link email"
  echo "Error: $(echo "$LINK_RESPONSE" | jq -r '.error')"
fi

echo ""
echo "=== Step 4: Verify the user's email was updated ==="
USER_RESPONSE=$(curl -s -X GET "${SUPABASE_URL}/auth/v1/user" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

CURRENT_EMAIL=$(echo "$USER_RESPONSE" | jq -r '.email')
echo "Current email in session: $CURRENT_EMAIL"

if [ "$CURRENT_EMAIL" == "$NEW_EMAIL" ]; then
  echo "✅ Email successfully updated!"
else
  echo "⚠️ Email may not be updated in current session (need to re-login)"
fi

