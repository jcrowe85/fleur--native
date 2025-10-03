#!/bin/bash

# Test script for Vercel Slack webhook edge function
# Replace YOUR_VERCEL_URL with your actual Vercel deployment URL

echo "🧪 Testing Vercel Slack Webhook Edge Function"
echo "=============================================="

# Set your Vercel deployment URL here
VERCEL_URL="https://fleur-native.vercel.app"
WEBHOOK_ENDPOINT="$VERCEL_URL/api/slack-webhook"

echo "Testing endpoint: $WEBHOOK_ENDPOINT"
echo ""

# Test 1: Basic connectivity test
echo "1. Testing basic connectivity..."
curl -X POST "$WEBHOOK_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"test": "connectivity"}' \
  -w "\nHTTP Status: %{http_code}\nResponse Time: %{time_total}s\n" \
  -v

echo ""
echo "----------------------------------------"
echo ""

# Test 2: Slack URL verification challenge
echo "2. Testing Slack URL verification..."
curl -X POST "$WEBHOOK_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "url_verification",
    "challenge": "test_challenge_12345"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -v

echo ""
echo "----------------------------------------"
echo ""

# Test 3: Simulate a support team reply (thread message)
echo "3. Testing support team reply simulation..."
curl -X POST "$WEBHOOK_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "event": {
      "type": "message",
      "text": "Hello! This is a test support reply from the team.",
      "user": "U1234567890",
      "ts": "1640995200.123456",
      "thread_ts": "1640995100.000000"
    },
    "type": "event_callback"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -v

echo ""
echo "----------------------------------------"
echo ""

# Test 4: Test with OPTIONS (CORS preflight)
echo "4. Testing CORS preflight..."
curl -X OPTIONS "$WEBHOOK_ENDPOINT" \
  -H "Origin: https://your-app.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -w "\nHTTP Status: %{http_code}\n" \
  -v

echo ""
echo "=============================================="
echo "✅ Webhook testing complete!"
echo ""
echo "Expected results:"
echo "- Test 1: Should return 200 or 400 (method validation)"
echo "- Test 2: Should return 'test_challenge_12345'"
echo "- Test 3: Should return 200 (may fail if no user found, that's OK)"
echo "- Test 4: Should return 200 with CORS headers"
echo ""
echo "If any test fails, check:"
echo "1. VERCEL_URL is correct"
echo "2. Edge function is deployed"
echo "3. Environment variables are set"
echo "4. No authentication issues"
