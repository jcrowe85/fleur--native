#!/bin/bash

# Test script for checkout creation with discount code
# This tests the full flow: create discount code, then create checkout with it

echo "🧪 Testing Checkout Creation with Discount Code"
echo "==============================================="

# Server URL
SERVER_URL="http://localhost:3000"

# Test data
USER_ID="test_user_123"
CART_ITEMS='[{"sku":"bloom","qty":1},{"sku":"shampoo","qty":1},{"sku":"conditioner","qty":1}]'
LINE_ITEMS='[{"merchandiseId":"gid://shopify/ProductVariant/44826097221811","quantity":1}]'

echo "📡 Server URL: $SERVER_URL"
echo "👤 User ID: $USER_ID"
echo "🛒 Cart Items: $CART_ITEMS"
echo "📦 Line Items: $LINE_ITEMS"
echo ""

# Step 1: Create discount code
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

# Step 2: Test checkout creation with discount code
echo "🔍 Step 2: Testing checkout creation with discount code..."

# Test the client-side createCheckout function via a simple API call
# Since we don't have a direct endpoint for this, let's test the Shopify Storefront API directly

echo "📤 Testing Shopify Storefront API with discount code..."

# Get Shopify credentials from server .env file
STORE_DOMAIN="163bfa-5f.myshopify.com"
STOREFRONT_TOKEN="3a5402ed3172d6d275483c80c8c4a6db"

echo "🏪 Using Shopify store: $STORE_DOMAIN"

# GraphQL mutation for cart creation with discount
CART_CREATE_MUTATION='
mutation CartCreate($input: CartInput!) {
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

# Variables for the mutation
VARIABLES=$(cat <<EOF
{
  "input": {
    "lines": $LINE_ITEMS,
    "discountCodes": ["$DISCOUNT_CODE"]
  }
}
EOF
)

echo "📋 GraphQL Variables:"
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
    echo "✅ Shopify API request successful!"
    
    # Check if discount was applied
    APPLICABLE=$(echo "$RESPONSE_BODY" | jq -r '.data.cartCreate.cart.discountCodes[0].applicable' 2>/dev/null)
    if [ "$APPLICABLE" = "true" ]; then
        echo "✅ Discount code is applicable and should be applied!"
    elif [ "$APPLICABLE" = "false" ]; then
        echo "❌ Discount code is not applicable"
        echo "   This could be due to:"
        echo "   - Discount code not yet active"
        echo "   - Product doesn't meet discount requirements"
        echo "   - Discount code expired"
    else
        echo "⚠️  Could not determine discount applicability"
    fi
    
    # Check total amount
    TOTAL_AMOUNT=$(echo "$RESPONSE_BODY" | jq -r '.data.cartCreate.cart.cost.totalAmount.amount' 2>/dev/null)
    if [ "$TOTAL_AMOUNT" != "null" ] && [ "$TOTAL_AMOUNT" != "" ]; then
        echo "💰 Total Amount: \$$TOTAL_AMOUNT"
    fi
    
    # Get checkout URL
    CHECKOUT_URL=$(echo "$RESPONSE_BODY" | jq -r '.data.cartCreate.cart.checkoutUrl' 2>/dev/null)
    if [ "$CHECKOUT_URL" != "null" ] && [ "$CHECKOUT_URL" != "" ]; then
        echo "🔗 Checkout URL: $CHECKOUT_URL"
    fi
else
    echo "❌ Shopify API request failed"
    echo "   Check your Shopify credentials and network connection"
fi

echo ""
echo "🏁 Test completed!"
echo ""
echo "📝 Summary:"
echo "   ✅ Discount code creation: Working"
echo "   $(if [ "$HTTP_CODE" -eq 200 ]; then echo "✅ Shopify API: Working"; else echo "❌ Shopify API: Failed"; fi)"
echo "   $(if [ "$APPLICABLE" = "true" ]; then echo "✅ Discount application: Working"; else echo "❌ Discount application: Not working"; fi)"
echo ""
echo "🔧 Next steps:"
echo "   1. If discount is not applicable, check Shopify discount settings"
echo "   2. Verify the discount code is active and not expired"
echo "   3. Test with real products that meet discount requirements"
echo "   4. Check the full checkout flow in the mobile app"
