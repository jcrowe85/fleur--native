#!/bin/bash

# Detailed webhook debugging to see the exact error
echo "🔍 Detailed Webhook Debug"
echo "========================"

VERCEL_URL="https://fleur-native.vercel.app"

# Test with verbose output to see the exact error
echo "Testing webhook with detailed error reporting..."

curl -X POST "$VERCEL_URL/api/slack-webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "event": {
      "type": "message",
      "text": "Debug test message",
      "user": "U1234567890",
      "ts": "1640995200.123456",
      "thread_ts": "1640995100.000000"
    },
    "type": "event_callback"
  }' \
  -w "\n\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  -v 2>&1 | head -50

echo ""
echo "========================"
echo "If you're still getting 'Failed to store support message',"
echo "the issue is likely in the webhook code itself."
echo ""
echo "Check:"
echo "1. Is the support_messages table accessible?"
echo "2. Are the RLS policies blocking the insert?"
echo "3. Is the webhook using the correct column names?"
