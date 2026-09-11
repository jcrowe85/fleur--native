#!/usr/bin/env bash
# Starts the Fleur dev stack fully detached from the calling shell, so the
# processes survive whatever kills the session that launched them.
#
#   ./start-dev.sh          start API (:3005) + Metro (:8081)
#   ./start-dev.sh stop     stop both
#   ./start-dev.sh status   show what is listening
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOGDIR="/tmp/fleur-dev"; mkdir -p "$LOGDIR"

port_pid() { ss -tlnp 2>/dev/null | grep -F ":$1 " | grep -oE 'pid=[0-9]+' | cut -d= -f2 | head -1; }

case "${1:-start}" in
  stop)
    for p in 3005 8081; do
      pid="$(port_pid "$p")"
      if [ -n "$pid" ]; then kill "$pid" 2>/dev/null; echo "stopped :$p (pid $pid)"; fi
    done
    exit 0;;
  status)
    for p in 3005 8081; do echo ":$p -> ${(port_pid "$p"):-down}"; done 2>/dev/null || \
      for p in 3005 8081; do echo ":$p -> $(port_pid "$p")"; done
    exit 0;;
esac

# EXPO_PUBLIC_* are inlined into the bundle at build time, so Metro has to be
# started with them already exported — changing them later does nothing until
# Metro restarts.
set -a; . "$ROOT/server/.env"; set +a
WSLIP="$(ip -4 addr show eth0 | awk '/inet /{print $2}' | cut -d/ -f1)"
export EXPO_PUBLIC_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
export EXPO_PUBLIC_API_BASE="http://${WSLIP}:3005"
export EXPO_PUBLIC_SHOPIFY_STORE_DOMAIN="$SHOPIFY_STORE_DOMAIN"
export EXPO_PUBLIC_SHOPIFY_STOREFRONT_TOKEN="$SHOPIFY_STOREFRONT_ACCESS_TOKEN"

if [ -z "$(port_pid 3005)" ]; then
  ( cd "$ROOT/server" && setsid nohup npx ts-node src/index.ts >"$LOGDIR/api.log" 2>&1 </dev/null & )
  echo "API starting  -> $LOGDIR/api.log"
else
  echo "API already up on :3005"
fi

if [ -z "$(port_pid 8081)" ]; then
  ( cd "$ROOT" && setsid nohup npx expo start --port 8081 >"$LOGDIR/metro.log" 2>&1 </dev/null & )
  echo "Metro starting -> $LOGDIR/metro.log"
else
  echo "Metro already up on :8081"
fi

echo "app will reach the API at http://${WSLIP}:3005"
