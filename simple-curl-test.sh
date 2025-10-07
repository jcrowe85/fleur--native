#!/bin/bash

# Simple curl test for send-verification-code function
# Usage: ./simple-curl-test.sh [email] [code]

EMAIL=${1:-"test@example.com"}
CODE=${2:-"123456"}
EXPIRES_AT=$(date -d "+1 hour" -u +"%Y-%m-%dT%H:%M:%S.%3NZ")

echo "Testing send-verification-code function..."
echo "Email: $EMAIL"
echo "Code: $CODE"
echo ""

curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -d "{
    \"email\": \"$EMAIL\",
    \"code\": \"$CODE\",
    \"expiresAt\": \"$EXPIRES_AT\"
  }" \
  http://127.0.0.1:54321/functions/v1/send-verification-code

echo ""
