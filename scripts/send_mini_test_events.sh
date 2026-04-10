#!/usr/bin/env bash
# Create a session and send attention_mini_test_started + attention_mini_test_completed.
# Usage: ./scripts/send_mini_test_events.sh [base_url]
# Default base_url: http://localhost:8000/api/v1

set -e
BASE="${1:-http://localhost:8000/api/v1}"
USER_ID="${USER_ID:-11111111-1111-1111-1111-111111111111}"

echo "Creating session for user $USER_ID..."
SESSION_RESP=$(curl -s -X POST "$BASE/sessions/" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\": \"$USER_ID\", \"device_type\": \"web\", \"user_agent\": \"script\"}")
SESSION_ID=$(echo "$SESSION_RESP" | grep -o '"session_id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$SESSION_ID" ]; then
  echo "Failed to create session. Response: $SESSION_RESP"
  exit 1
fi
echo "Session ID: $SESSION_ID"

echo "Sending attention_mini_test_started..."
curl -s -X POST "$BASE/analytics/events" -H "Content-Type: application/json" -d "{
  \"event_type\": \"attention_mini_test_started\",
  \"timestamp\": \"2025-03-01T12:00:00Z\",
  \"user_id\": \"$USER_ID\",
  \"session_id\": \"$SESSION_ID\",
  \"data\": { \"trigger\": \"session_start\" }
}"
echo ""

echo "Sending attention_mini_test_completed..."
curl -s -X POST "$BASE/analytics/events" -H "Content-Type: application/json" -d "{
  \"event_type\": \"attention_mini_test_completed\",
  \"timestamp\": \"2025-03-01T12:01:00Z\",
  \"user_id\": \"$USER_ID\",
  \"session_id\": \"$SESSION_ID\",
  \"data\": { \"score\": 0.85 }
}"
echo ""
echo "Done. Both events should return 202."
