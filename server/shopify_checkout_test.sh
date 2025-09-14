#!/usr/bin/env bash
set -euo pipefail

DEBUG="${DEBUG:-}"

DOMAIN="${EXPO_PUBLIC_SHOPIFY_STORE_DOMAIN:-}"
TOKEN="${EXPO_PUBLIC_SHOPIFY_STOREFRONT_TOKEN:-}"

# Flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="$2"; shift 2 ;;
    --token)  TOKEN="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--domain your-shop.myshopify.com] [--token TOKEN] VARIANT:QTY [VARIANT:QTY ...]"
      exit 0
      ;;
    *) break ;;
  esac
done

if [[ -z "${DOMAIN}" || -z "${TOKEN}" ]]; then
  echo "ERROR: Missing DOMAIN or TOKEN."
  exit 1
fi
if [[ $# -lt 1 ]]; then
  echo "ERROR: Provide at least one line item as VARIANT_ID:QTY"
  exit 1
fi

DOMAIN="${DOMAIN#http://}"; DOMAIN="${DOMAIN#https://}"; DOMAIN="${DOMAIN%/}"

to_gid () {
  local id="$1"
  if [[ "$id" =~ ^gid:// ]]; then echo "$id"
  elif [[ "$id" =~ ^[0-9]+$ ]]; then echo "gid://shopify/ProductVariant/${id}"
  else echo "$id"; fi
}

# Build lines
LINES=""
for pair in "$@"; do
  VAR="${pair%%:*}"; QTY="${pair##*:}"
  [[ -z "$VAR" || -z "$QTY" || ! "$QTY" =~ ^[0-9]+$ ]] && { echo "Bad line item: $pair"; exit 1; }
  GID="$(to_gid "$VAR")"
  ITEM="{\"quantity\":${QTY},\"merchandiseId\":\"${GID}\"}"
  [[ -z "$LINES" ]] && LINES="$ITEM" || LINES="$LINES,$ITEM"
done

QUERY='mutation CartCreate($input: CartInput) { cartCreate(input: $input) { cart { id checkoutUrl } userErrors { field message } } }'
QUERY_ESCAPED=${QUERY//\"/\\\"}

PAYLOAD=$(cat <<JSON
{
  "query": "${QUERY_ESCAPED}",
  "variables": { "input": { "lines": [ ${LINES} ] } }
}
JSON
)

[[ -n "${DEBUG}" ]] && { echo "Payload:"; echo "$PAYLOAD"; echo; }

RESP=$(curl -sS -X POST "https://${DOMAIN}/api/2024-07/graphql.json" \
  -H "X-Shopify-Storefront-Access-Token: ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  --data "${PAYLOAD}")

echo "Raw response:"
echo "${RESP}" | sed 's/\\n/\n/g'

if command -v jq >/dev/null 2>&1; then
  echo
  echo "Parsed:"
  ERR_TOP=$(echo "$RESP" | jq -r '(.errors // []) | map(.message) | join("; ")')
  ERR_USER=$(echo "$RESP" | jq -r '.data.cartCreate.userErrors // [] | map(.message) | join("; ")')
  URL=$(echo "$RESP" | jq -r '.data.cartCreate.cart.checkoutUrl // empty')
  [[ -n "$ERR_TOP" && "$ERR_TOP" != "null" ]] && echo "GraphQL errors: $ERR_TOP"
  [[ -n "$ERR_USER" && "$ERR_USER" != "null" && "$ERR_USER" != "" ]] && echo "User errors: $ERR_USER"
  [[ -n "$URL" ]] &&
