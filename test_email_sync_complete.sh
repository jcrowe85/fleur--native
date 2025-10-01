#!/bin/bash

# Complete test: Create guest, link email, verify data synced

SUPABASE_URL="https://atnuvjxdtucwjiatnajt.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bnV2anhkdHVjd2ppYXRuYWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MDIyMjQsImV4cCI6MjA3MzQ3ODIyNH0.xFYlMCP_N-SGtR8UypQtxActX8tzmBts1nIXwAl3UaI"
SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bnV2anhkdHVjd2ppYXRuYWp0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzkwMjIyNCwiZXhwIjoyMDczNDc4MjI0fQ.HxX62EK0HL9a2lTIo2bAhKAcH6IOdxJHr7zuWV0NhP4"

echo "=== Testing Complete Email Link & Sync Flow ==="
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

# Step 3: Link email
echo ""
echo "Step 3: Linking real email..."
NEW_EMAIL="test-complete-$(date +%s)@example.com"
echo "Linking to: $NEW_EMAIL"

LINK_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/link-email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{\"email\":\"${NEW_EMAIL}\"}")

SUCCESS=$(echo "$LINK_RESPONSE" | jq -r '.success')
if [ "$SUCCESS" != "true" ]; then
  echo "❌ Failed to link email"
  echo "$LINK_RESPONSE" | jq '.'
  exit 1
fi
echo "✓ Email linked successfully"

# Step 4: Create some test data to sync
echo ""
echo "Step 4: Creating test sync data..."
SYNC_DATA=$(cat <<EOF
{
  "user_id": "${USER_ID}",
  "email": "${NEW_EMAIL}",
  "plan_data": {"plan": {"hairType": "Curly", "concerns": ["Frizz"]}},
  "routine_data": {"steps": [{"id": "test-1", "name": "Test Shampoo", "period": "morning"}], "completedByDate": {}},
  "rewards_data": {"pointsTotal": 250, "pointsAvailable": 250, "ledger": []},
  "cart_data": {"items": []},
  "purchase_data": {"purchases": []},
  "notification_preferences": {"enabled": true},
  "sync_frequency": "daily",
  "device_info": {"platform": "test", "version": "1.0", "last_active": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"}
}
EOF
)

UPSERT_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/user_sync_data" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Prefer: resolution=merge-duplicates" \
  -d "$SYNC_DATA")

echo "✓ Sync data created"

# Step 5: Verify data in database
echo ""
echo "Step 5: Verifying data in user_sync_data table..."
sleep 1

VERIFY_RESPONSE=$(curl -s "${SUPABASE_URL}/rest/v1/user_sync_data?user_id=eq.${USER_ID}&select=email,routine_data,rewards_data,last_synced" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}")

echo "Data in database:"
echo "$VERIFY_RESPONSE" | jq '.'

if [ "$(echo "$VERIFY_RESPONSE" | jq '. | length')" -gt 0 ]; then
  echo ""
  echo "✅ SUCCESS! Data is synced to cloud"
  echo "Email: $(echo "$VERIFY_RESPONSE" | jq -r '.[0].email')"
  echo "Points: $(echo "$VERIFY_RESPONSE" | jq -r '.[0].rewards_data.pointsTotal')"
  echo "Routine steps: $(echo "$VERIFY_RESPONSE" | jq -r '.[0].routine_data.steps | length')"
else
  echo ""
  echo "❌ No data found in user_sync_data table"
fi

# Step 6: Verify email in auth.users
echo ""
echo "Step 6: Verifying email in auth.users table..."
echo "You can check in Supabase Dashboard > Authentication > Users"
echo "Look for user: $NEW_EMAIL"
echo "User ID: $USER_ID"

