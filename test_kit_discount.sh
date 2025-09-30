#!/bin/bash

# Test script for kit discount code generation
# This tests the server endpoint directly to ensure discount codes are being created

echo "🧪 Testing Kit Discount Code Generation"
echo "========================================"

# Server URL (adjust if needed)
SERVER_URL="http://localhost:3000"

# Test data
USER_ID="test_user_123"
CART_ITEMS='[{"sku":"bloom","qty":1},{"sku":"shampoo","qty":1},{"sku":"conditioner","qty":1}]'

echo "📡 Server URL: $SERVER_URL"
echo "👤 User ID: $USER_ID"
echo "🛒 Cart Items: $CART_ITEMS"
echo ""

# Test 1: Check if server is running
echo "🔍 Test 1: Checking if server is running..."
if curl -s --connect-timeout 5 "$SERVER_URL/health" > /dev/null 2>&1; then
    echo "✅ Server is running"
else
    echo "❌ Server is not running or not accessible"
    echo "   Please start the server with: cd server && npm start"
    exit 1
fi

# Test 2: Test kit discount endpoint
echo ""
echo "🔍 Test 2: Testing kit discount code creation..."
echo "📤 Sending POST request to /api/shopify/kit-discount"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$SERVER_URL/api/shopify/kit-discount" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"cartItems\": $CART_ITEMS
  }")

# Split response and status code
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$RESPONSE" | head -n -1)

echo "📊 HTTP Status Code: $HTTP_CODE"
echo "📋 Response Body:"
echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Kit discount code creation successful!"
    
    # Extract discount code from response
    DISCOUNT_CODE=$(echo "$RESPONSE_BODY" | jq -r '.discountCode' 2>/dev/null)
    if [ "$DISCOUNT_CODE" != "null" ] && [ "$DISCOUNT_CODE" != "" ]; then
        echo "🎫 Generated Discount Code: $DISCOUNT_CODE"
        
        # Test 3: Verify discount code format
        echo ""
        echo "🔍 Test 3: Verifying discount code format..."
        if [[ "$DISCOUNT_CODE" =~ ^KIT_20_.*_[0-9]+$ ]]; then
            echo "✅ Discount code format is correct (KIT_20_[user]_[timestamp])"
        else
            echo "⚠️  Discount code format might be incorrect: $DISCOUNT_CODE"
        fi
    else
        echo "❌ No discount code found in response"
    fi
else
    echo "❌ Kit discount code creation failed"
    echo "   Check server logs for more details"
fi

# Test 4: Test with invalid data
echo ""
echo "🔍 Test 4: Testing with invalid data (should fail)..."
INVALID_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$SERVER_URL/api/shopify/kit-discount" \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}')

INVALID_HTTP_CODE=$(echo "$INVALID_RESPONSE" | tail -n1)
INVALID_RESPONSE_BODY=$(echo "$INVALID_RESPONSE" | head -n -1)

echo "📊 HTTP Status Code: $INVALID_HTTP_CODE"
echo "📋 Response Body:"
echo "$INVALID_RESPONSE_BODY" | jq . 2>/dev/null || echo "$INVALID_RESPONSE_BODY"

if [ "$INVALID_HTTP_CODE" -eq 400 ]; then
    echo "✅ Invalid data properly rejected (400 status)"
else
    echo "⚠️  Expected 400 status for invalid data, got $INVALID_HTTP_CODE"
fi

echo ""
echo "🏁 Test completed!"
echo ""
echo "📝 Next steps:"
echo "   1. If tests pass, the issue might be in the client-side checkout"
echo "   2. Check server logs for any Shopify API errors"
echo "   3. Verify Shopify credentials are properly configured"
echo "   4. Test the full checkout flow in the app"
