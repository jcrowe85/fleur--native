#!/usr/bin/env bash
set -euo pipefail

# ===== Remote Supabase config (defaults to your provided values) =====
SUPABASE_URL="${SUPABASE_URL:-https://atnuvjxdtucwjiatnajt.supabase.co}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0bnV2anhkdHVjd2N3amlhdG5hanQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc1NzkwMjIyNCwiZXhwIjoyMDczNDc4MjI0fQ.xFYlMCP_N-SGtR8UypQtxActX8tzmBts1nIXwAl3UaI}"
FUNC_NAME="${FUNC_NAME:-send-verification-code}"

# ===== Test inputs =====
EMAIL="${1:-${EMAIL:-test@example.com}}"
CODE="${2:-${CODE:-123456}}"
EXPIRES_MIN="${EXPIRES_MIN:-60}"

# Compute expiry timestamp (UTC, with millis)
if date -u -d "now + ${EXPIRES_MIN} minutes" +"%Y-%m-%dT%H:%M:%S.%3NZ" >/dev/null 2>&1; then
  EXPIRES_AT="$(date -u -d "now + ${EXPIRES_MIN} minutes" +"%Y-%m-%dT%H:%M:%S.%3NZ")"
else
  EXPIRES_AT="$(gdate -u -d "now + ${EXPIRES_MIN} minutes" +"%Y-%m-%dT%H:%M:%S.%3NZ")"
fi

URL="${SUPABASE_URL}/functions/v1/${FUNC_NAME}"

echo "🧪 Testing ${FUNC_NAME} (REMOTE)"
echo "API: ${URL}"
echo "📧 Email: ${EMAIL}"
echo "🔢 Code:  ${CODE}"
echo "⏰ Expires At: ${EXPIRES_AT}"
echo

# Reachability (don’t hard-fail if blocked by corporate VPN)
if curl -fsS "${SUPABASE_URL}/auth/v1/health" >/dev/null 2>&1; then
  echo "✅ Reachable: ${SUPABASE_URL}"
else
  echo "⚠️  Could not reach ${SUPABASE_URL}/auth/v1/health — continuing anyway..."
fi
echo

PAYLOAD=$(cat <<JSON
{
  "email": "${EMAIL}",
  "code": "${CODE}",
  "expiresAt": "${EXPIRES_AT}"
}
JSON
)

echo "📤 POST ${URL}"
echo "📋 Payload:"
echo "${PAYLOAD}"
echo

# Call the deployed Edge Function
RESPONSE="$(curl -sS -w '\n%{http_code}' \
  -X POST "${URL}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  --data "${PAYLOAD}")"

HTTP_CODE="$(echo "${RESPONSE}" | tail -n1)"
BODY="$(echo "${RESPONSE}" | head -n-1)"

echo "📊 Status: ${HTTP_CODE}"
echo "📄 Body:"
echo "${BODY}"
echo

if [[ "${HTTP_CODE}" == "200" ]]; then
  echo "✅ SUCCESS: Verification code request accepted by Edge Function."
else
  echo "❌ ERROR: Request failed with status ${HTTP_CODE}"
  echo "   • If body says \"Email service not configured\": set REMOTE secrets (RESEND_API_KEY, optional RESEND_FROM) in your project."
  echo "   • If body shows sender/domain issues: use a verified sender (e.g. onboarding@resend.dev) via RESEND_FROM until DNS verifies."
  echo
  echo "🔎 Remote logs:"
  echo "   supabase functions logs ${FUNC_NAME} --project-ref atnuvjxdtucwjiatnajt --since 30m"
fi
