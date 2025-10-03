#!/bin/bash

# Test the ProfileScreen sync flow by simulating the app's behavior

SUPABASE_URL="https://atnuvjxdtucwjiatnajt.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bnV2anhkdHVjd2ppYXRuYWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc5MDIyMjQsImV4cCI6MjA3MzQ3ODIyNH0.xFYlMCP_N-SGtR8UypQtxActX8tzmBts1nIXwAl3UaI"

echo "=== Testing ProfileScreen Sync Flow ==="
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

# Step 2: Sign in (simulating user opening app)
echo ""
echo "Step 2: Signing in (user opens app)..."
SIGNIN_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -d "{\"email\":\"${GUEST_EMAIL}\",\"password\":\"${GUEST_PASSWORD}\"}")

ACCESS_TOKEN=$(echo "$SIGNIN_RESPONSE" | jq -r '.access_token')
USER_ID=$(echo "$SIGNIN_RESPONSE" | jq -r '.user.id')
echo "✓ Signed in. User ID: $USER_ID"

# Step 3: Simulate user clicking "Add Email & Sync" in ProfileScreen
echo ""
echo "Step 3: User clicks 'Add Email & Sync' button..."
NEW_EMAIL="profile-test-$(date +%s)@example.com"
echo "User enters email: $NEW_EMAIL"

# Step 4: Link email (simulating ProfileScreen handleAddEmail function)
echo ""
echo "Step 4: Linking email via ProfileScreen..."
LINK_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/functions/v1/link-email" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -d "{\"email\":\"${NEW_EMAIL}\",\"password\":\"profilepassword123\"}")

SUCCESS=$(echo "$LINK_RESPONSE" | jq -r '.success')
if [ "$SUCCESS" != "true" ]; then
  echo "❌ Failed to link email"
  echo "$LINK_RESPONSE" | jq '.'
  exit 1
fi
echo "✓ Email linked successfully"

# Step 5: Simulate cloud sync (what happens after email linking)
echo ""
echo "Step 5: Performing cloud sync..."
SYNC_DATA=$(cat <<EOF
{
  "user_id": "${USER_ID}",
  "email": "${NEW_EMAIL}",
  "plan_data": {
    "plan": {"hairType": "Curly", "concerns": ["Frizz", "Volume"]},
    "hasSeenScheduleIntro": true
  },
  "routine_data": {
    "steps": [
      {"id": "shampoo-1", "name": "Gentle Cleanser", "period": "morning"},
      {"id": "conditioner-1", "name": "Hydrating Conditioner", "period": "morning"}
    ],
    "completedByDate": {"2025-10-03": ["shampoo-1"]}
  },
  "rewards_data": {
    "pointsTotal": 375,
    "pointsAvailable": 375,
    "ledger": [
      {"id": "signup", "points": 250, "reason": "Welcome bonus", "date": "2025-10-03"}
    ]
  },
  "cart_data": {
    "items": [
      {"id": "product-1", "name": "Premium Shampoo", "quantity": 1}
    ]
  },
  "purchase_data": {
    "purchases": []
  },
  "notification_preferences": {
    "enabled": true,
    "routineReminders": true,
    "promotions": false
  },
  "sync_frequency": "daily",
  "device_info": {
    "platform": "mobile",
    "version": "1.0.0",
    "last_active": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  }
}
EOF
)

UPSERT_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/rest/v1/user_sync_data" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Prefer: resolution=merge-duplicates" \
  -d "$SYNC_DATA")

echo "✓ Cloud sync completed"

# Step 6: Verify the complete data
echo ""
echo "Step 6: Verifying complete sync data..."
sleep 1

VERIFY_RESPONSE=$(curl -s "${SUPABASE_URL}/rest/v1/user_sync_data?user_id=eq.${USER_ID}&select=*" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

echo "Complete sync data:"
echo "$VERIFY_RESPONSE" | jq '.[0] | {email, plan_data, routine_data, rewards_data, cart_data, notification_preferences}'

if [ "$(echo "$VERIFY_RESPONSE" | jq '. | length')" -gt 0 ]; then
  echo ""
  echo "✅ PROFILE SCREEN SYNC SUCCESS!"
  echo "📧 Email: $(echo "$VERIFY_RESPONSE" | jq -r '.[0].email')"
  echo "💇 Hair Type: $(echo "$VERIFY_RESPONSE" | jq -r '.[0].plan_data.plan.hairType')"
  echo "🏆 Points: $(echo "$VERIFY_RESPONSE" | jq -r '.[0].rewards_data.pointsTotal')"
  echo "🛁 Routine Steps: $(echo "$VERIFY_RESPONSE" | jq -r '.[0].routine_data.steps | length')"
  echo "🛒 Cart Items: $(echo "$VERIFY_RESPONSE" | jq -r '.[0].cart_data.items | length')"
  echo "🔔 Notifications: $(echo "$VERIFY_RESPONSE" | jq -r '.[0].notification_preferences.enabled')"
else
  echo ""
  echo "❌ No data found in user_sync_data table"
fi

echo ""
echo "🎉 ProfileScreen sync flow test complete!"
