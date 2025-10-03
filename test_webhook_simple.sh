#!/bin/bash

echo "🧪 Simple Webhook Test"
echo "====================="

# Test with a simple message
curl -X POST https://fleur-native.vercel.app/api/slack-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "message",
    "text": "Test message from webhook",
    "user": "U1234567890",
    "channel": "C1234567890",
    "ts": "1234567890.123456"
  }' \
  -w "\n\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n"

echo ""
echo "If you see HTTP Status 200, the webhook received the message."
echo "If you see HTTP Status 500, there's an error in the webhook."
