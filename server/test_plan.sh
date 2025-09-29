#!/usr/bin/env bash
set -euo pipefail

# Enhanced test script for Fleur questionnaire API
# Usage: ./test_plan.sh [scenario] [base_url]
# Scenarios: postpartum, menopause, teen, regular, complex, all

BASE="${2:-http://localhost:3000/api/plan/build}"
SCENARIO="${1:-postpartum}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 FLEUR QUESTIONNAIRE API TESTER${NC}"
echo -e "${BLUE}================================${NC}"
echo -e "Base URL: ${CYAN}$BASE${NC}"
echo -e "Scenario: ${CYAN}$SCENARIO${NC}"
echo

# Test scenarios
declare -A SCENARIOS

SCENARIOS[postpartum]='{
  "persona": "postpartum",
  "hairType": "medium-straight",
  "washFreq": "every 2–3 days",
  "goals": ["increase thickness", "improve scalp health", "add shine & softness"],
  "constraints": "color-treated: occasionally; heat: few times per week",
  "__detail": {
    "concerns": ["opt_crown_temples", "opt_breakage_dryness", "opt_scalp_irritation"],
    "goalsRaw": ["opt_goal_regrow", "opt_goal_scalp_health", "opt_goal_shine"],
    "hairTypeDetail": {"texture": "medium", "curlPattern": "straight"},
    "scalpType": "opt_dry",
    "colorFrequency": "opt_color_occasionally",
    "heatUsage": "opt_heat_few_per_week",
    "postpartumWindow": "opt_pp_0_3"
  }
}'

SCENARIOS[menopause]='{
  "persona": "menopause",
  "hairType": "fine-straight",
  "washFreq": "2x/week",
  "goals": ["reduce shedding", "increase thickness"],
  "constraints": "heat: never; color-treated: regularly",
  "__detail": {
    "concerns": ["opt_crown_temples", "opt_excess_shedding"],
    "goalsRaw": ["opt_goal_regrow", "opt_goal_reduce_shedding"],
    "hairTypeDetail": {"texture": "fine", "curlPattern": "straight"},
    "scalpType": "opt_balanced",
    "colorFrequency": "opt_color_regularly",
    "heatUsage": "opt_heat_never",
    "menopauseStage": "opt_meno_meno"
  }
}'

SCENARIOS[teen]='{
  "persona": "general",
  "hairType": "thick-curly",
  "washFreq": "daily",
  "goals": ["define curls", "reduce frizz"],
  "constraints": "heat: daily",
  "__detail": {
    "concerns": ["opt_breakage_dryness", "opt_lack_volume"],
    "goalsRaw": ["opt_goal_shine", "opt_goal_strengthen"],
    "hairTypeDetail": {"texture": "thick", "curlPattern": "curly"},
    "scalpType": "opt_oily",
    "heatUsage": "opt_heat_daily"
  }
}'

SCENARIOS[regular]='{
  "persona": "general",
  "hairType": "medium-straight",
  "washFreq": "2x/week",
  "goals": ["reduce shedding", "strengthen strands"],
  "constraints": "heat: daily; color-treated: regularly",
  "__detail": {
    "concerns": ["opt_excess_shedding", "opt_breakage_dryness"],
    "goalsRaw": ["opt_goal_reduce_shedding", "opt_goal_strengthen"],
    "hairTypeDetail": {"texture": "medium", "curlPattern": "straight"},
    "scalpType": "opt_balanced",
    "colorFrequency": "opt_color_regularly",
    "heatUsage": "opt_heat_daily"
  }
}'

SCENARIOS[complex]='{
  "persona": "postpartum",
  "hairType": "thick-curly",
  "washFreq": "daily",
  "goals": ["define curls", "reduce frizz", "strengthen strands", "improve scalp health", "add shine & softness"],
  "constraints": "heat: daily; color-treated: regularly; lifestyle: gym; lifestyle: swim; daily supplements",
  "__detail": {
    "concerns": ["opt_crown_temples", "opt_excess_shedding", "opt_breakage_dryness", "opt_lack_volume", "opt_scalp_irritation"],
    "goalsRaw": ["opt_goal_regrow", "opt_goal_reduce_shedding", "opt_goal_scalp_health", "opt_goal_strengthen", "opt_goal_shine", "opt_goal_wellness"],
    "hairTypeDetail": {"texture": "thick", "curlPattern": "curly"},
    "scalpType": "opt_sensitive",
    "colorFrequency": "opt_color_regularly",
    "heatUsage": "opt_heat_daily",
    "postpartumWindow": "opt_pp_3_6"
  }
}'

# Function to run a single test
run_test() {
  local scenario_name="$1"
  local payload="$2"
  
  echo -e "${PURPLE}📋 Testing: $scenario_name${NC}"
  echo -e "${YELLOW}Expected:${NC}"
  case "$scenario_name" in
    "postpartum"|"menopause")
      echo "  - 3 supplements (Biotin, Iron, Vitamin D3)"
      echo "  - Supplements after core products"
      ;;
    "teen"|"regular")
      echo "  - 0 supplements"
      echo "  - Focus on hair care products"
      ;;
    "complex")
      echo "  - 3 supplements (Biotin, Iron, Vitamin D3)"
      echo "  - 8 total recommendations"
      ;;
  esac
  echo
  
  # Temp file for response
  local tmp_json="$(mktemp)"
  local http_status="$(curl -sS -o "$tmp_json" -w "%{http_code}" \
    -X POST "$BASE" \
    -H "Content-Type: application/json" \
    -d "$payload")"
  
  echo -e "${BLUE}HTTP Status:${NC} $http_status"
  
  if [[ "$http_status" != "200" ]]; then
    echo -e "${RED}❌ Error: Non-200 status${NC}"
    echo "Response:"
    cat "$tmp_json"
    rm -f "$tmp_json"
    return 1
  fi
  
  # Parse and display results
  python3 - "$tmp_json" "$scenario_name" <<'PY'
import json, sys

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

# Load response
with open(sys.argv[1], 'r') as f:
    d = json.load(f)
scenario = sys.argv[2]

# Summary
print(f"\n📊 SUMMARY")
print(f"Title: {get(d, 'summary.primary.title', '')}")
print(f"Confidence: {get(d, 'summary.primary.confidence', '')}")

# Drivers
drivers = arr(get(d, 'summary.drivers', []))
if drivers:
    print(f"\n🎯 Key Drivers:")
    for chip in drivers:
        print(f"  • {chip.get('label', '')}")

# Quick wins
quick_wins = arr(get(d, 'summary.quickWins', []))
if quick_wins:
    print(f"\n⚡ Quick Wins:")
    for w in quick_wins:
        print(f"  • {w}")

# Routine
print(f"\n🔄 ROUTINE")
print(f"Title: {get(d, 'routine.overview.title', '')}")

pillars = arr(get(d, 'routine.weeklyPillars', []))
if pillars:
    print(f"\n📋 Weekly Pillars ({len(pillars)}):")
    for i, p in enumerate(pillars, 1):
        print(f"  {i}. {p.get('text', '')}")

# Recommendations
recs = arr(get(d, 'recommendations', []))
print(f"\n🛍️  RECOMMENDATIONS ({len(recs)})")

# Check supplements
supplements = [r for r in recs if any(s in r.get('handle', '').lower() for s in ['biotin', 'iron', 'vitamin-d3'])]
print(f"\n💊 Supplements: {len(supplements)}")
for s in supplements:
    print(f"  • {s.get('title', '')} ({s.get('handle', '')})")

print(f"\n📦 All Products:")
for i, r in enumerate(recs, 1):
    handle = r.get('handle', '')
    is_supplement = any(s in handle.lower() for s in ['biotin', 'iron', 'vitamin-d3'])
    marker = "💊" if is_supplement else "🧴"
    print(f"  {i}. {marker} {r.get('title', '')} ({handle})")

# Validation
print(f"\n✅ VALIDATION:")
if scenario in ['postpartum', 'menopause']:
    if len(supplements) == 3:
        print("  ✅ Correct number of supplements (3)")
    else:
        print(f"  ❌ Expected 3 supplements, got {len(supplements)}")
    
    # Check order (supplements should be after core products)
    core_products = ['bloom', 'shampoo', 'conditioner']
    supplement_handles = [s.get('handle', '') for s in supplements]
    
    core_indices = []
    supplement_indices = []
    
    for i, r in enumerate(recs):
        handle = r.get('handle', '')
        if handle in core_products:
            core_indices.append(i)
        if handle in supplement_handles:
            supplement_indices.append(i)
    
    if core_indices and supplement_indices:
        max_core = max(core_indices)
        min_supplement = min(supplement_indices)
        if min_supplement > max_core:
            print("  ✅ Supplements appear after core products")
        else:
            print("  ❌ Supplements should appear after core products")
else:
    if len(supplements) == 0:
        print("  ✅ No supplements (correct for non-hormonal user)")
    else:
        print(f"  ❌ Expected 0 supplements, got {len(supplements)}")

print(f"\n{'='*60}")
PY
  
  rm -f "$tmp_json"
  echo
}

# Main execution
if [[ "$SCENARIO" == "all" ]]; then
  echo -e "${GREEN}🚀 Running all test scenarios...${NC}"
  echo
  for scenario in "${!SCENARIOS[@]}"; do
    run_test "$scenario" "${SCENARIOS[$scenario]}"
  done
else
  if [[ -n "${SCENARIOS[$SCENARIO]:-}" ]]; then
    run_test "$SCENARIO" "${SCENARIOS[$SCENARIO]}"
  else
    echo -e "${RED}❌ Unknown scenario: $SCENARIO${NC}"
    echo -e "${YELLOW}Available scenarios:${NC}"
    for scenario in "${!SCENARIOS[@]}"; do
      echo "  • $scenario"
    done
    echo "  • all"
    exit 1
  fi
fi

echo -e "${GREEN}🎉 Testing complete!${NC}"