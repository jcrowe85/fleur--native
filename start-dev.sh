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

# How the device reaches this machine.
#
# The emulator runs on the Windows side; Metro and the API run in WSL2. The
# usual emulator setup — `adb reverse` plus 127.0.0.1 — does NOT work here,
# and it fails silently: adb's server is the Windows one, so a reverse tunnel
# connects from Windows to *Windows'* localhost, and this WSL instance does not
# forward localhost. Measured:
#
#   Windows -> http://127.0.0.1:8081/status        connection failed
#   Windows -> http://172.19.16.202:8081/status    200
#
# So the device must use the WSL eth0 address. Set FLEUR_DEV_MODE=localhost
# only if localhost forwarding is ever turned back on.
MODE="${FLEUR_DEV_MODE:-lan}"
if [ "$MODE" = "localhost" ]; then
  HOSTIP="127.0.0.1"
  export REACT_NATIVE_PACKAGER_HOSTNAME="$HOSTIP"
  adb reverse tcp:8081 tcp:8081 >/dev/null 2>&1 && adb reverse tcp:3005 tcp:3005 >/dev/null 2>&1
else
  HOSTIP="$(ip -4 addr show eth0 | awk '/inet /{print $2}' | cut -d/ -f1)"
  export REACT_NATIVE_PACKAGER_HOSTNAME="$HOSTIP"
fi

export EXPO_PUBLIC_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
export EXPO_PUBLIC_API_BASE="http://${HOSTIP}:3005"
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

echo "mode=$MODE — app will reach the API at http://${HOSTIP}:3005"
echo "open with: adb shell am start -a android.intent.action.VIEW -d exp://${HOSTIP}:8081 host.exp.exponent"
