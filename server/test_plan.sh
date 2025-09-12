#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./test_plan.sh                       # defaults to http://localhost:3000/api/plan/build
#   ./test_plan.sh http://localhost:3000/plan/build   # if router is mounted at /plan

BASE="${1:-http://localhost:3000/api/plan/build}"

# ---- payload to test ----
PAYLOAD="$(cat <<'JSON'
{
    "persona": "menopause",
    "hairType": "medium-straight",
    "washFreq": "1x/week or less",
    "goals": ["increase thickness","reduce shedding","strengthen strands"],
    "constraints": "heat: never; color-treated: regularly",
    "__detail": {
      "concerns": ["opt_crown_temples","opt_lack_volume"],
      "goalsRaw": ["opt_goal_regrow","opt_goal_reduce_shedding","opt_goal_strengthen"],
      "scalpType": "opt_balanced",
      "colorFrequency": "opt_color_regularly",
      "heatUsage": "opt_heat_never",
      "menopauseStage": "opt_meno_meno",
      "washFreqDetail": { "label": "opt_once_week_or_less", "perWeek": 1 }
  }
}
JSON
)"

echo ">> Hitting API: $BASE"
echo ">> Payload:"
echo "$PAYLOAD"
echo

# Temp file for raw response
TMP_JSON="$(mktemp)"
HTTP_STATUS="$(curl -sS -o "$TMP_JSON" -w "%{http_code}" \
  -X POST "$BASE" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")"

echo ">> HTTP status: $HTTP_STATUS"
echo ">> Raw response:"
cat "$TMP_JSON"
echo

# Non-200 → show body and exit
if [[ "$HTTP_STATUS" != "200" ]]; then
  echo "!! Non-200 status from server. See raw response above."
  exit 1
fi

# Pretty-print selected fields (no jq)
python3 - "$TMP_JSON" <<'PY'
import json, sys, pathlib

raw = pathlib.Path(sys.argv[1]).read_text()
try:
    d = json.loads(raw)
except Exception as e:
    print("!! Could not parse JSON:", e)
    print(raw)
    sys.exit(1)

def get(o, path, default=None):
    cur = o
    for k in path.split('.'):
        if isinstance(cur, list):
            try: k = int(k)
            except: return default
        try: cur = cur[k]
        except Exception: return default
    return cur if cur is not None else default

def arr(x): return x if isinstance(x, list) else []
def sec(t): print(f"\n=== {t} ===")

# SUMMARY
sec("SUMMARY → primary")
print("Title     :", get(d, "summary.primary.title",""))
print("Paragraph :", get(d, "summary.primary.paragraph",""))
print("Confidence:", get(d, "summary.primary.confidence",""))

sec("SUMMARY → what's driving this (drivers)")
for chip in arr(get(d,"summary.drivers",[])):
    print(f"- [{chip.get('icon','')}] {chip.get('label','')}")

sec("SUMMARY → quick wins")
for w in arr(get(d,"summary.quickWins",[])):
    print(f"- {w}")

print("\nHeads up  :", get(d, "summary.headsUp",""))

# ROUTINE
sec("ROUTINE → overview")
print("Title     :", get(d, "routine.overview.title",""))
print("Paragraph :", get(d, "routine.overview.paragraph",""))

sec("ROUTINE → weekly pillars")
for p in arr(get(d, "routine.weeklyPillars", [])):
    print(f"- {p.get('text','')}  (icon: {p.get('icon','')})")

sec("ROUTINE → why this works")
for w in arr(get(d, "routine.why", [])):
    print(f"- {w}")

notes = arr(get(d, "routine.notes", []))
if notes:
    sec("ROUTINE → notes")
    for n in notes: print(f"- {n}")

# RECOMMENDATIONS
recs = arr(get(d,"recommendations",[]))
sec(f"RECOMMENDATIONS ({len(recs)})")
for i, r in enumerate(recs, 1):
    prod = r.get("product",{}) or {}
    print(f"{i}. {r.get('title','')}")
    print(f"   Why       : {r.get('why','')}")
    print(f"   How to use: {r.get('howToUse','')}")
    print(f"   Product   : {prod.get('name','')}  {prod.get('price','')}")
    print(f"   Link      : {prod.get('url','')}")
PY

# Cleanup
rm -f "$TMP_JSON"
