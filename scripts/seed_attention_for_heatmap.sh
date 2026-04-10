#!/usr/bin/env bash
# Seed attention_metrics with question_answered events so the Focus dashboard
# heatmap and trend show data. Creates a session and sends several events
# in the same (weekday, hour) so the peaks API returns at least one window.
#
# Usage: ./scripts/seed_attention_for_heatmap.sh [base_url]

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

# Send several question_answered events. Use a fixed recent timestamp so
# hour_of_day and day_of_week are stable (Saturday 19:15 UTC = one bucket).
# Peaks API needs min_samples (default 2) per (day_of_week, hour_of_day).
for i in 1 2 3 4 5; do
  echo "Sending question_answered $i/5..."
  curl -s -X POST "$BASE/analytics/events" -H "Content-Type: application/json" -d "{
    \"event_type\": \"question_answered\",
    \"timestamp\": \"2025-03-01T19:15:00Z\",
    \"user_id\": \"$USER_ID\",
    \"session_id\": \"$SESSION_ID\",
    \"data\": {
      \"question_id\": \"00000000-0000-0000-0000-00000000000$i\",
      \"answer\": \"A\",
      \"is_correct\": true,
      \"response_latency_ms\": $(( 600 + i * 50 ))
    }
  }" > /dev/null
done

# Another bucket: Sunday 14:00 UTC so heatmap has 2 cells
for i in 1 2 3; do
  echo "Sending question_answered for second bucket $i/3..."
  curl -s -X POST "$BASE/analytics/events" -H "Content-Type: application/json" -d "{
    \"event_type\": \"question_answered\",
    \"timestamp\": \"2025-03-02T14:00:00Z\",
    \"user_id\": \"$USER_ID\",
    \"session_id\": \"$SESSION_ID\",
    \"data\": {
      \"question_id\": \"00000000-0000-0000-0000-00000000001$i\",
      \"answer\": \"B\",
      \"is_correct\": true,
      \"response_latency_ms\": $(( 500 + i * 30 ))
    }
  }" > /dev/null
done

echo "Done. Reload the Focus page (/dashboard/attention) to see the trend and heatmap."
echo "User ID: $USER_ID"
