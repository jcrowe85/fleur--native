#!/bin/bash

# Test script to verify the app's checkout flow matches the working test
# This simulates exactly what the app does when creating a checkout

echo "🧪 Testing App's Checkout Flow"
echo "=============================="

# Server URL
SERVER_URL="http://localhost:3000"

# Test data (matching app's cart flow)
USER_ID="app_test_789"
CART_ITEMS='[{"sku":"bloom","qty":1},{"sku":"shampoo","qty":1},{"sku":"conditioner","qty":1},{"sku":"micro-roller","qty":1}]'

echo "📡 Server URL: $SERVER_URL"
echo "👤 User ID: $USER_ID"
echo "🛒 Cart Items (Full Kit): $CART_ITEMS"
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

# Step 2: Test with app's exact GraphQL mutation and variables
echo "🔍 Step 2: Testing app's exact checkout flow..."

# App's exact GraphQL mutation (updated version)
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

# App's exact line items (using cartStore variant IDs)
LINE_ITEMS='[
  {"variantId":"gid://shopify/ProductVariant/44138306273459","quantity":1},
  {"variantId":"gid://shopify/ProductVariant/45032954888371","quantity":1},
  {"variantId":"gid://shopify/ProductVariant/45033047720115","quantity":1},
  {"variantId":"gid://shopify/ProductVariant/44138710597811","quantity":1}
]'

echo "📦 Line Items (App's Variant IDs):"
echo "$LINE_ITEMS" | jq . 2>/dev/null || echo "$LINE_ITEMS"
echo ""

# App's exact variables format
VARIABLES=$(cat <<EOF
{
  "input": {
    "lines": [
      {
        "quantity": 1,
        "merchandiseId": "gid://shopify/ProductVariant/44138306273459"
      },
      {
        "quantity": 1,
        "merchandiseId": "gid://shopify/ProductVariant/45032954888371"
      },
      {
        "quantity": 1,
        "merchandiseId": "gid://shopify/ProductVariant/45033047720115"
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

echo "📋 GraphQL Variables (App's Format):"
echo "$VARIABLES" | jq . 2>/dev/null || echo "$VARIABLES"
echo ""

# Make the request to Shopify Storefront API (same as app)
STORE_DOMAIN="163bfa-5f.myshopify.com"
STOREFRONT_TOKEN="3a5402ed3172d6d275483c80c8c4a6db"
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
    echo "✅ App checkout creation successful!"
    
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
        echo "🌐 This is the URL the app should be generating"
        echo "   Compare this with the URL you see in the app's checkout"
    fi
else
    echo "❌ App checkout creation failed"
fi

echo ""
echo "🏁 Test completed!"
echo ""
echo "📝 Summary:"
echo "   ✅ Discount code creation: Working"
echo "   $(if [ "$HTTP_CODE" -eq 200 ]; then echo "✅ App checkout: Working"; else echo "❌ App checkout: Failed"; fi)"
echo "   $(if [ "$APPLICABLE" = "true" ]; then echo "✅ Discount application: Working"; else echo "❌ Discount application: Not working"; fi)"
echo ""
echo "🔧 Next steps:"
echo "   1. Check the app's console logs for the debug output"
echo "   2. Compare the checkout URL generated by this test with the app's URL"
echo "   3. If URLs match but discount doesn't show, check timing issues"
echo "   4. If URLs don't match, there's a difference in the checkout flow"
