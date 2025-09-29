#!/bin/bash

# Test script for optimized Fleur Plan API
# Tests the reduced complexity LLM request with various questionnaire scenarios

API_URL="http://localhost:3000/api/plan/build"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="test_results_${TIMESTAMP}.json"

echo "🧪 Testing Optimized Fleur Plan API"
echo "=================================="
echo "API URL: $API_URL"
echo "Log file: $LOG_FILE"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test scenarios based on questionnaire structure
declare -a TEST_SCENARIOS=(
    "menopause_fine_straight"
    "postpartum_medium_wavy" 
    "general_coarse_curly"
    "menopause_fine_coily"
    "general_medium_straight"
)

# Function to make API call and log results
test_scenario() {
    local scenario_name=$1
    local payload=$2
    
    echo -e "${BLUE}Testing: $scenario_name${NC}"
    echo "Payload: $(echo $payload | jq -c .)"
    
    # Make the API call
    response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "$payload")
    
    # Split response and status code
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    # Log the result
    result=$(jq -n \
        --arg scenario "$scenario_name" \
        --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
        --arg http_code "$http_code" \
        --argjson payload "$(echo $payload)" \
        --argjson response "$(echo $response_body | jq . 2>/dev/null || echo $response_body)" \
        '{scenario: $scenario, timestamp: $timestamp, http_code: $http_code, payload: $payload, response: $response}')
    
    echo "$result" >> "$LOG_FILE"
    
    # Display result
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✅ Success (HTTP $http_code)${NC}"
        
        # Extract key metrics
        title=$(echo $response_body | jq -r '.summary.primary.title // "N/A"' 2>/dev/null)
        confidence=$(echo $response_body | jq -r '.summary.primary.confidence // "N/A"' 2>/dev/null)
        quick_wins_count=$(echo $response_body | jq '.summary.quickWins | length' 2>/dev/null)
        recommendations_count=$(echo $response_body | jq '.recommendations | length' 2>/dev/null)
        
        echo "  Title: $title"
        echo "  Confidence: $confidence"
        echo "  Quick Wins: $quick_wins_count"
        echo "  Recommendations: $recommendations_count"
    else
        echo -e "${RED}❌ Failed (HTTP $http_code)${NC}"
        echo "  Response: $response_body"
    fi
    
    echo ""
}

# Test 1: Menopause + Fine Straight Hair
test_scenario "menopause_fine_straight" '{
    "persona": "menopause",
    "hairType": "fine-straight",
    "washFreq": "2x/week",
    "goals": ["reduce shedding", "increase thickness"],
    "constraints": "color-treated: occasionally; heat: few times per week; menopause-stage: opt_meno_peri",
    "__detail": {
        "concerns": ["opt_crown_temples", "opt_excess_shedding"],
        "goalsRaw": ["opt_goal_reduce_shedding", "opt_goal_regrow"],
        "hairTypeDetail": {
            "texture": "fine",
            "curlPattern": "straight"
        },
        "scalpType": "opt_dry",
        "colorFrequency": "opt_color_occasionally",
        "heatUsage": "opt_heat_few_per_week",
        "menopauseStage": "opt_meno_peri",
        "washFreqDetail": {
            "label": "opt_twice_week",
            "perWeek": 2
        },
        "constraintsDetail": {
            "dryScalp": true
        }
    }
}'

# Test 2: Postpartum + Medium Wavy Hair
test_scenario "postpartum_medium_wavy" '{
    "persona": "postpartum",
    "hairType": "medium-wavy",
    "washFreq": "every 2–3 days",
    "goals": ["reduce shedding", "improve scalp health"],
    "constraints": "postpartum-window: opt_pp_3_6; heat: rarely",
    "__detail": {
        "concerns": ["opt_excess_shedding", "opt_scalp_irritation"],
        "goalsRaw": ["opt_goal_reduce_shedding", "opt_goal_scalp_health"],
        "hairTypeDetail": {
            "texture": "medium",
            "curlPattern": "wavy"
        },
        "scalpType": "opt_sensitive",
        "heatUsage": "opt_heat_rare",
        "postpartumWindow": "opt_pp_3_6",
        "washFreqDetail": {
            "label": "opt_every_2_3",
            "perWeek": 3
        },
        "constraintsDetail": {
            "oilyScalp": false
        }
    }
}'

# Test 3: General + Coarse Curly Hair
test_scenario "general_coarse_curly" '{
    "persona": "general",
    "hairType": "coarse-curly",
    "washFreq": "1x/week or less",
    "goals": ["strengthen strands", "add shine & softness"],
    "constraints": "color-treated: regularly; heat: daily",
    "__detail": {
        "concerns": ["opt_breakage_dryness", "opt_lack_volume"],
        "goalsRaw": ["opt_goal_strengthen", "opt_goal_shine"],
        "hairTypeDetail": {
            "texture": "coarse",
            "curlPattern": "curly"
        },
        "scalpType": "opt_balanced",
        "colorFrequency": "opt_color_regularly",
        "heatUsage": "opt_heat_daily",
        "washFreqDetail": {
            "label": "opt_once_week_or_less",
            "perWeek": 1
        },
        "constraintsDetail": {
            "dryScalp": false,
            "oilyScalp": false
        }
    }
}'

# Test 4: Menopause + Fine Coily Hair
test_scenario "menopause_fine_coily" '{
    "persona": "menopause",
    "hairType": "fine-coily",
    "washFreq": "daily",
    "goals": ["reduce shedding", "improve scalp health", "long-term wellness"],
    "constraints": "menopause-stage: opt_meno_meno; heat: never; daily supplements",
    "__detail": {
        "concerns": ["opt_crown_temples", "opt_excess_shedding", "opt_scalp_irritation"],
        "goalsRaw": ["opt_goal_reduce_shedding", "opt_goal_scalp_health", "opt_goal_wellness"],
        "hairTypeDetail": {
            "texture": "fine",
            "curlPattern": "coily"
        },
        "scalpType": "opt_dry",
        "heatUsage": "opt_heat_never",
        "menopauseStage": "opt_meno_meno",
        "washFreqDetail": {
            "label": "opt_daily",
            "perWeek": 7
        },
        "constraintsDetail": {
            "dryScalp": true
        }
    }
}'

# Test 5: General + Medium Straight Hair (Minimal)
test_scenario "general_medium_straight" '{
    "persona": "general",
    "hairType": "medium-straight",
    "washFreq": "2x/week",
    "goals": ["general improvement"],
    "constraints": null,
    "__detail": {
        "concerns": ["opt_other"],
        "goalsRaw": [],
        "hairTypeDetail": {
            "texture": "medium",
            "curlPattern": "straight"
        },
        "scalpType": "opt_balanced",
        "washFreqDetail": {
            "label": "opt_twice_week",
            "perWeek": 2
        }
    }
}'

echo -e "${YELLOW}📊 Test Summary${NC}"
echo "==============="

# Analyze results
total_tests=$(jq -s 'length' "$LOG_FILE")
successful_tests=$(jq -s '[.[] | select(.http_code == "200")] | length' "$LOG_FILE")
failed_tests=$((total_tests - successful_tests))

echo "Total tests: $total_tests"
echo -e "Successful: ${GREEN}$successful_tests${NC}"
echo -e "Failed: ${RED}$failed_tests${NC}"

if [ $failed_tests -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
else
    echo -e "${RED}⚠️  Some tests failed. Check the log file for details.${NC}"
fi

echo ""
echo "📄 Detailed results saved to: $LOG_FILE"

# Show response time analysis if all tests passed
if [ $failed_tests -eq 0 ]; then
    echo ""
    echo -e "${BLUE}📈 Response Analysis${NC}"
    echo "=================="
    
    # Extract response sizes and show optimization impact
    echo "Response structure validation:"
    jq -r '.scenario + ": " + (.response | keys | join(", "))' "$LOG_FILE"
    
    echo ""
    echo "Quick wins count per scenario:"
    jq -r '.scenario + ": " + (.response.summary.quickWins | length | tostring)' "$LOG_FILE"
    
    echo ""
    echo "Recommendations count per scenario:"
    jq -r '.scenario + ": " + (.response.recommendations | length | tostring)' "$LOG_FILE"
fi

echo ""
echo "🔍 To view full results: cat $LOG_FILE | jq ."


