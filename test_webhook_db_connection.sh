#!/bin/bash

# Test webhook database connection
# This simulates what the webhook is trying to do

echo "🔍 Testing Webhook Database Connection"
echo "====================================="

VERCEL_URL="https://fleur-native.vercel.app"

# Test 1: Check if environment variables are set
echo "1. Testing webhook environment..."
curl -X POST "$VERCEL_URL/api/slack-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "event": {
      "type": "message",
      "text": "ENV_TEST: Checking environment variables",
      "user": "U1234567890",
      "ts": "1640995200.123456",
      "thread_ts": "1640995100.000000"
    },
    "type": "event_callback"
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s

echo ""
echo "----------------------------------------"
echo ""

# Test 2: Test with a simpler message format
echo "2. Testing with minimal message..."
curl -X POST "$VERCEL_URL/api/slack-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "event": {
      "type": "message",
      "text": "Simple test message",
      "user": "U1234567890",
      "ts": "1640995200.123456"
    },
    "type": "event_callback"
  }' \
  -w "\nStatus: %{http_code}\n" \
  -s

echo ""
echo "====================================="
echo "If both tests return 500 errors, the issue is likely:"
echo "1. Missing SUPABASE_URL environment variable"
echo "2. Missing SUPABASE_SERVICE_ROLE_KEY environment variable"
echo "3. Database connection issue"
echo "4. RLS policy blocking inserts"
echo ""
echo "Check your Vercel environment variables!"
