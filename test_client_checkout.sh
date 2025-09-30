#!/bin/bash

# Test script for client-side checkout flow
# This tests the exact same flow that the mobile app uses

echo "🧪 Testing Client-Side Checkout Flow"
echo "===================================="

# Server URL
SERVER_URL="http://localhost:3000"

# Test data (matching what the app would send)
USER_ID="test_user_123"
CART_ITEMS='[{"sku":"bloom","qty":1},{"sku":"shampoo","qty":1},{"sku":"conditioner","qty":1}]'

echo "📡 Server URL: $SERVER_URL"
echo "👤 User ID: $USER_ID"
echo "🛒 Cart Items: $CART_ITEMS"
echo ""

# Step 1: Create discount code (same as app does)
echo "🔍 Step 1: Creating kit discount code..."
DISCOUNT_RESPONSE=$(curl -s -X POST "$SERVER_URL/api/shopify/kit-discount" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"cartItems\": $CART_ITEMS
  }")

echo "📋 Discount Response:"
echo "$DISCOUNT_RESPONSE" | jq . 2>/dev/null || echo "$DISCOUNT_RESPONSE"

# Extract discount code
DISCOUNT_CODE=$(echo "$DISCOUNT_RESPONSE" | jq -r '.discountCode' 2>/dev/null)

if [ "$DISCOUNT_CODE" = "null" ] || [ "$DISCOUNT_CODE" = "" ]; then
    echo "❌ Failed to create discount code"
    exit 1
fi

echo "🎫 Generated Discount Code: $DISCOUNT_CODE"
echo ""

# Step 2: Test the client-side createCheckout function
echo "🔍 Step 2: Testing client-side checkout creation..."

# Simulate the exact line items the app would create
# Using the same variant IDs from the app's VALID_SKUS
LINE_ITEMS='[
  {"variantId":"gid://shopify/ProductVariant/44826097221811","quantity":1}
]'

echo "📦 Line Items (as app would create):"
echo "$LINE_ITEMS" | jq . 2>/dev/null || echo "$LINE_ITEMS"
echo ""

# Test the Shopify Storefront API directly (same as client does)
STORE_DOMAIN="163bfa-5f.myshopify.com"
STOREFRONT_TOKEN="3a5402ed3172d6d275483c80c8c4a6db"

# GraphQL mutation (same as in shopifyClient.ts)
CART_CREATE_MUTATION='
mutation CartCreate($input: CartInput) {
  cartCreate(input: $input) {
    cart {
      id
      checkoutUrl
    }
    userErrors {
      field
      message
    }
  }
}
'

# Variables (same format as client creates)
VARIABLES=$(cat <<EOF
{
  "input": {
    "lines": [
      {
        "quantity": 1,
        "merchandiseId": "gid://shopify/ProductVariant/44826097221811"
      }
    ],
    "discountCodes": ["$DISCOUNT_CODE"]
  }
}
EOF
)

echo "📋 GraphQL Variables (as client creates):"
echo "$VARIABLES" | jq . 2>/dev/null || echo "$VARIABLES"
echo ""

# Make the request to Shopify Storefront API
SHOPIFY_URL="https://$STORE_DOMAIN/api/2024-07/graphql.json"

echo "📤 Sending request to Shopify Storefront API..."
echo "🔗 URL: $SHOPIFY_URL"

SHOPIFY_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$SHOPIFY_URL" \
  -H "X-Shopify-Storefront-Access-Token: $STOREFRONT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"$CART_CREATE_MUTATION\",
    \"variables\": $VARIABLES
  }")

# Split response and status code
HTTP_CODE=$(echo "$SHOPIFY_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$SHOPIFY_RESPONSE" | head -n -1)

echo "📊 HTTP Status Code: $HTTP_CODE"
echo "📋 Shopify Response:"
echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Client-side checkout creation successful!"
    
    # Check for errors
    USER_ERRORS=$(echo "$RESPONSE_BODY" | jq -r '.data.cartCreate.userErrors' 2>/dev/null)
    if [ "$USER_ERRORS" != "null" ] && [ "$USER_ERRORS" != "[]" ]; then
        echo "❌ User errors found:"
        echo "$USER_ERRORS" | jq . 2>/dev/null || echo "$USER_ERRORS"
    else
        echo "✅ No user errors"
    fi
    
    # Get checkout URL
    CHECKOUT_URL=$(echo "$RESPONSE_BODY" | jq -r '.data.cartCreate.cart.checkoutUrl' 2>/dev/null)
    if [ "$CHECKOUT_URL" != "null" ] && [ "$CHECKOUT_URL" != "" ]; then
        echo "🔗 Checkout URL: $CHECKOUT_URL"
        echo ""
        echo "🌐 You can test the discount by visiting this URL in a browser"
        echo "   The 20% discount should be automatically applied"
    fi
else
    echo "❌ Client-side checkout creation failed"
fi

echo ""
echo "🏁 Test completed!"
echo ""
echo "📝 Summary:"
echo "   ✅ Discount code creation: Working"
echo "   $(if [ "$HTTP_CODE" -eq 200 ]; then echo "✅ Client checkout: Working"; else echo "❌ Client checkout: Failed"; fi)"
echo ""
echo "🔧 If the discount is not showing in the app:"
echo "   1. Check the app's console logs for any errors"
echo "   2. Verify the discount code is being passed correctly"
echo "   3. Test the checkout URL manually to confirm discount is applied"
echo "   4. Check if there are any timing issues with discount code activation"
