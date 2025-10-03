#!/bin/bash

# Quick webhook test - replace with your actual Vercel URL
VERCEL_URL="https://fleur-native.vercel.app"

echo "🚀 Quick Vercel Webhook Test"
echo "============================"
echo "Testing: $VERCEL_URL/api/slack-webhook"
echo ""

# Test URL verification (most basic test)
echo "Testing Slack URL verification..."
curl -X POST "$VERCEL_URL/api/slack-webhook" \
  -H "Content-Type: application/json" \
  -d '{"type": "url_verification", "challenge": "test123"}' \
  -w "\nStatus: %{http_code}\n" \
  -s

echo ""
echo "If you see 'test123' returned, your webhook is working!"
echo "If you see an error, check your VERCEL_URL in the script."
