#!/usr/bin/env bash

DB_HOST="db.atnuvjxdtucwjiatnajt.supabase.co"
POOLER_HOST="aws-1-us-east-2.pooler.supabase.com"
DB_PORT=5432
POOLER_PORT=6543

# Resolve IPv4 using DNS-over-HTTPS to bypass local DNS issues
resolve_ipv4() {
  local host=$1
  local ip

  ip=$(curl -s -H 'accept: application/dns-json' "https://1.1.1.1/dns-query?name=${host}&type=A" \
      | grep -oE '"data":"[0-9\.]+"' | head -n1 | cut -d':' -f2 | tr -d '"')
  
  if [ -z "$ip" ]; then
    ip=$(curl -s -H 'accept: application/dns-json' "https://dns.google/resolve?name=${host}&type=A" \
        | grep -oE '"data":"[0-9\.]+"' | head -n1 | cut -d':' -f2 | tr -d '"')
  fi

  echo "$ip"
}

check_port() {
  local host=$1
  local port=$2
  local name=$3
  echo "🧭 Testing $name ($host:$port)..."

  if nc -4 -vz "$host" "$port" >/dev/null 2>&1; then
    echo "✅ Port $port on $name is OPEN."
  else
    echo "❌ Port $port on $name is BLOCKED or UNREACHABLE."
  fi
  echo
}

# Resolve and test DB host (5432)
DB_IPV4=$(resolve_ipv4 "$DB_HOST")
echo "Resolved DB IPv4: $DB_IPV4"
if [ -z "$DB_IPV4" ]; then
  echo "❌ Failed to resolve DB IPv4 ($DB_HOST)."
else
  check_port "$DB_IPV4" "$DB_PORT" "Supabase DB (5432)"
fi

# Resolve and test Pooler host (6543)
POOLER_IPV4=$(resolve_ipv4 "$POOLER_HOST")
echo "Resolved Pooler IPv4: $POOLER_IPV4"
if [ -z "$POOLER_IPV4" ]; then
  echo "❌ Failed to resolve Pooler IPv4 ($POOLER_HOST)."
else
  check_port "$POOLER_IPV4" "$POOLER_PORT" "Supabase Pooler (6543)"
fi
