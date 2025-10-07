#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${1:-tryfleur.com}"
HOST="${2:-resend}"                  # subdomain label for Resend (e.g., "resend")
REGION="${3:-us-east-1}"            # SES/Resend feedback region (for MX sanity check)

SUB="${HOST}.${DOMAIN}"
DKIM_SELECTOR="${HOST}._domainkey.${DOMAIN}"
DMARC="_dmarc.${DOMAIN}"

PASS=0; FAIL=0

hr(){ printf '%*s\n' "${COLUMNS:-80}" '' | tr ' ' - ; }

check_txt() {
  local fqdn="$1" must_contain="$2" label="$3"
  echo "🔎 TXT ${fqdn}"
  local out; out="$(dig +short TXT "${fqdn}" 2>/dev/null | sed 's/^"//; s/"$//')"
  if [[ -z "${out}" ]]; then
    echo "❌ ${label}: NO TXT found"
    ((FAIL++))
  elif [[ -n "${must_contain}" && "${out}" != *"${must_contain}"* ]]; then
    echo "❌ ${label}: TXT found but missing '${must_contain}'"
    echo "   Got: ${out}"
    ((FAIL++))
  else
    echo "✅ ${label}: ${out}"
    ((PASS++))
  fi
}

check_mx() {
  local fqdn="$1" must_host="feedback-smtp.${REGION}.amazonaws.com." label="$2"
  echo "🔎 MX  ${fqdn}"
  local out; out="$(dig +short MX "${fqdn}" 2>/dev/null)"
  if [[ -z "${out}" ]]; then
    echo "❌ ${label}: NO MX found"
    ((FAIL++))
    return
  fi
  echo "   MX records:"
  echo "${out}" | sed 's/^/   - /'
  if echo "${out}" | grep -qi "${must_host}"; then
    echo "✅ ${label}: contains ${must_host}"
    ((PASS++))
  else
    echo "⚠️  ${label}: did not see ${must_host} (may still be OK if Resend shows a different feedback host for your region)"
    ((FAIL++))
  fi
}

echo "Checking Resend DNS for:"
echo "  Domain       : ${DOMAIN}"
echo "  Resend host  : ${HOST}  (FQDN: ${SUB})"
echo "  Expected MX  : feedback-smtp.${REGION}.amazonaws.com."
hr

# 1) SPF on subdomain (TXT at resend.tryfleur.com)
check_txt "${SUB}" "v=spf1" "SPF TXT"
# Optional tightened check:
if dig +short TXT "${SUB}" | tr -d '"' | grep -qi "v=spf1" && \
   ! dig +short TXT "${SUB}" | tr -d '"' | grep -qi "include:amazonses.com"; then
  echo "⚠️  SPF TXT exists but is missing 'include:amazonses.com' (Resend/SES usually requires it)"
fi
hr

# 2) DKIM selector (TXT at resend._domainkey.tryfleur.com) should start with p=
echo "🔎 TXT ${DKIM_SELECTOR}"
DKIM_TXT="$(dig +short TXT "${DKIM_SELECTOR}" | tr -d '"')"
if [[ -z "${DKIM_TXT}" ]]; then
  echo "❌ DKIM TXT: NONE found at ${DKIM_SELECTOR}"
  ((FAIL++))
else
  if echo "${DKIM_TXT}" | grep -q '^p='; then
    echo "✅ DKIM TXT present (starts with p=...)"
    ((PASS++))
  else
    echo "⚠️  DKIM TXT present but unexpected format:"
    echo "   ${DKIM_TXT}"
    ((FAIL++))
  fi
fi
hr

# 3) MX for subdomain (MX at resend.tryfleur.com)
check_mx "${SUB}" "MX for subdomain"
hr

# 4) DMARC at root (optional but good)
check_txt "${DMARC}" "v=DMARC1" "DMARC TXT (root)"
hr

# Cross-check via public resolvers (helps catch local caching)
echo "🌐 Public resolver sanity (Cloudflare 1.1.1.1)"
for name in "${SUB}" "${DKIM_SELECTOR}" "${DMARC}"; do
  printf "   %-40s -> %s\n" "${name}" "$(dig @1.1.1.1 +short TXT "${name}" | tr -d '"')"
done
echo "🌐 Public resolver sanity (Google 8.8.8.8)"
for name in "${SUB}" "${DKIM_SELECTOR}" "${DMARC}"; do
  printf "   %-40s -> %s\n" "${name}" "$(dig @8.8.8.8 +short TXT "${name}" | tr -d '"')"
done
hr

echo "Result: ✅ ${PASS} passed, ❌ ${FAIL} failed"
if (( FAIL > 0 )); then exit 1; else exit 0; fi
