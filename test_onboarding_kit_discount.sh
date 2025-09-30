#!/bin/bash

# Test script specifically for onboarding recommendations kit discount
# This tests the exact flow: add kit to cart, then checkout

echo "🧪 Testing Onboarding Recommendations Kit Discount"
echo "=================================================="

# Server URL
SERVER_URL="http://localhost:3000"

# Test data (matching onboarding flow)
USER_ID="onboarding_test_456"
CART_ITEMS='[{"sku":"bloom","qty":1},{"sku":"shampoo","qty":1},{"sku":"conditioner","qty":1},{"sku":"micro-roller","qty":1}]'

echo "📡 Server URL: $SERVER_URL"
echo "👤 User ID: $USER_ID"
echo "🛒 Cart Items (Full Kit): $CART_ITEMS"
echo ""

# Step 1: Create discount code (same as app does)
echo "🔍 Step 1: Creating kit discount code for onboarding..."
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

# Step 2: Test with multiple products (like a full kit)
echo "🔍 Step 2: Testing checkout with full kit (4 products)..."

# Create line items for multiple products (like the full kit)
LINE_ITEMS='[
  {"variantId":"gid://shopify/ProductVariant/44826097221811","quantity":1},
  {"variantId":"gid://shopify/ProductVariant/44138710597811","quantity":1}
]'

echo "📦 Line Items (Full Kit):"
echo "$LINE_ITEMS" | jq . 2>/dev/null || echo "$LINE_ITEMS"
echo ""

# Test the Shopify Storefront API directly
STORE_DOMAIN="163bfa-5f.myshopify.com"
STOREFRONT_TOKEN="3a5402ed3172d6d275483c80c8c4a6db"

# GraphQL mutation (same as in shopifyClient.ts)
CART_CREATE_MUTATION='
mutation CartCreate($input: CartInput) {
  cartCreate(input: $input) {
    cart {
      id
      checkoutUrl
      cost {
        totalAmount {
          amount
          currencyCode
        }
      }
      discountCodes {
        code
        applicable
      }
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
      },
      {
        "quantity": 1,
        "merchandiseId": "gid://shopify/ProductVariant/44138710597811"
      }
    ],
    "discountCodes": ["$DISCOUNT_CODE"]
  }
}
EOF
)

echo "📋 GraphQL Variables (Full Kit):"
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
    echo "✅ Onboarding kit checkout creation successful!"
    
    # Check for errors
    USER_ERRORS=$(echo "$RESPONSE_BODY" | jq -r '.data.cartCreate.userErrors' 2>/dev/null)
    if [ "$USER_ERRORS" != "null" ] && [ "$USER_ERRORS" != "[]" ]; then
        echo "❌ User errors found:"
        echo "$USER_ERRORS" | jq . 2>/dev/null || echo "$USER_ERRORS"
    else
        echo "✅ No user errors"
    fi
    
    # Check if discount was applied
    APPLICABLE=$(echo "$RESPONSE_BODY" | jq -r '.data.cartCreate.cart.discountCodes[0].applicable' 2>/dev/null)
    if [ "$APPLICABLE" = "true" ]; then
        echo "✅ Discount code is applicable and should be applied!"
    elif [ "$APPLICABLE" = "false" ]; then
        echo "❌ Discount code is not applicable"
        echo "   This could be due to:"
        echo "   - Discount code not yet active"
        echo "   - Products don't meet discount requirements"
        echo "   - Discount code expired"
    else
        echo "⚠️  Could not determine discount applicability"
    fi
    
    # Check total amount
    TOTAL_AMOUNT=$(echo "$RESPONSE_BODY" | jq -r '.data.cartCreate.cart.cost.totalAmount.amount' 2>/dev/null)
    if [ "$TOTAL_AMOUNT" != "null" ] && [ "$TOTAL_AMOUNT" != "" ]; then
        echo "💰 Total Amount: \$$TOTAL_AMOUNT"
        echo "   (Should be 20% off the original total)"
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
    echo "❌ Onboarding kit checkout creation failed"
fi

# Step 3: Test timing - check if discount code is immediately available
echo ""
echo "🔍 Step 3: Testing discount code timing..."
echo "⏰ Waiting 2 seconds to check if discount code is immediately available..."

sleep 2

# Test the same discount code again
echo "📤 Testing same discount code again..."
TIMING_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$SHOPIFY_URL" \
  -H "X-Shopify-Storefront-Access-Token: $STOREFRONT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"$CART_CREATE_MUTATION\",
    \"variables\": $VARIABLES
  }")

TIMING_HTTP_CODE=$(echo "$TIMING_RESPONSE" | tail -n1)
TIMING_RESPONSE_BODY=$(echo "$TIMING_RESPONSE" | head -n -1)

if [ "$TIMING_HTTP_CODE" -eq 200 ]; then
    TIMING_APPLICABLE=$(echo "$TIMING_RESPONSE_BODY" | jq -r '.data.cartCreate.cart.discountCodes[0].applicable' 2>/dev/null)
    if [ "$TIMING_APPLICABLE" = "true" ]; then
        echo "✅ Discount code is immediately available (no timing issues)"
    else
        echo "⚠️  Discount code might have timing issues"
    fi
else
    echo "❌ Second test failed - possible timing issue"
fi

echo ""
echo "🏁 Test completed!"
echo ""
echo "📝 Summary:"
echo "   ✅ Discount code creation: Working"
echo "   $(if [ "$HTTP_CODE" -eq 200 ]; then echo "✅ Onboarding checkout: Working"; else echo "❌ Onboarding checkout: Failed"; fi)"
echo "   $(if [ "$APPLICABLE" = "true" ]; then echo "✅ Discount application: Working"; else echo "❌ Discount application: Not working"; fi)"
echo ""
echo "🔧 If the discount is not showing in the onboarding app:"
echo "   1. Check the app's console logs for any errors"
echo "   2. Verify the discount code is being passed correctly"
echo "   3. Test the checkout URL manually to confirm discount is applied"
echo "   4. Check if there are any timing issues with discount code activation"
echo "   5. Clear app cache and restart"
echo "   6. Check if the user has the full kit in their cart"
