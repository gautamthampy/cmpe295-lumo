
### Attention & Analytics Pipeline (Phase 1)

The Analytics & Attention agent is integrated into the main backend and works as follows:

1. **Sessions**: A lesson session is created via `POST /api/v1/sessions/`, which inserts a row into `events.sessions`.
2. **Event ingest**: Frontend or other services send `question_answered` events to `POST /api/v1/analytics/events` with:
   - `user_id`, `session_id`
   - `data.response_latency_ms`, `data.is_correct`, and optional `data.idle_ms` / `data.lesson_id`.
3. **Scoring & drift**:
   - The `attention_engine` normalizes latency, error rate, idle time, and variability into an `attention_score` in \[0,1].
   - A short, human-readable `rationale` is generated (for example, "Stable latency; low errors" or "Slow responses and repeated errors").
   - An EMA-based drift detector decides whether the learner is in drift and recommends `continue`, `recap`, or `break`.
4. **Persistence**:
   - Each scored event is written to `learner.attention_metrics` with `user_id`, `session_id`, `attention_score`, latency, and error_rate.
5. **Querying attention**:
   - `GET /api/v1/analytics/attention/{user_id}` returns recent attention snapshots plus `drift` and `recommended_action` for dashboards and agents.

#### Running attention tests

From the `backend/` directory:

```bash
uv venv
source .venv/bin/activate
uv pip install -e ".[dev]"

# Run all tests
pytest -v

# Or run only the attention-related tests
pytest tests/test_attention_engine.py tests/test_analytics_api.py -v
```

#### Manual curl examples

Create a session:

```bash
curl -X POST http://localhost:8000/api/v1/sessions/ \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "11111111-1111-1111-1111-111111111111",
    "device_type": "web",
    "user_agent": "curl-test"
  }'
```

Use the returned `session_id` to log a `question_answered` event:

```bash
curl -X POST http://localhost:8000/api/v1/analytics/events \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "question_answered",
    "timestamp": "2025-10-25T19:15:33Z",
    "user_id": "11111111-1111-1111-1111-111111111111",
    "session_id": "PASTE_SESSION_ID_HERE",
    "data": {
      "question_id": "33333333-3333-3333-3333-333333333333",
      "lesson_id": "44444444-4444-4444-4444-444444444444",
      "response_latency_ms": 900,
      "is_correct": true
    }
  }'
```

Query current attention for the same user:

```bash
curl http://localhost:8000/api/v1/analytics/attention/11111111-1111-1111-1111-111111111111
```

The response includes `recent` snapshots, `drift`, and a `recommended_action` and is the same data used by the frontend "Focus snapshot" panel.

---

### Demo Steps: How to Present the Attention & Analytics Work

Follow these steps when giving a demo of the Attention & Analytics agent.

#### 1. Prerequisites (before the demo)

- **Docker**: Start Postgres and Redis.
  ```bash
  docker compose up -d
  ```

- **Backend**: From `backend/`, run:
  ```bash
  source .venv/bin/activate
  uvicorn app.main:app --reload
  ```
  Confirm: `http://localhost:8000/health` returns `{"status":"healthy"}`.

- **Frontend**: From `frontend/`, run:
  ```bash
  npm run dev
  ```
  Open `http://localhost:3000` in the browser.

#### 2. Show the Sessions and Event Flow

1. **Create a session** (in a terminal):
   ```bash
   curl -X POST http://localhost:8000/api/v1/sessions/ \
     -H "Content-Type: application/json" \
     -d '{"user_id":"11111111-1111-1111-1111-111111111111","device_type":"web"}'
   ```
   Copy the `session_id` from the response.

2. **Send a few "good focus" events** (replace `SESSION_ID` with the value from step 1):
   ```bash
   curl -X POST http://localhost:8000/api/v1/analytics/events \
     -H "Content-Type: application/json" \
     -d '{
       "event_type":"question_answered",
       "timestamp":"2025-10-25T19:15:33Z",
       "user_id":"11111111-1111-1111-1111-111111111111",
       "session_id":"SESSION_ID",
       "data":{"response_latency_ms":900,"is_correct":true}
     }'
   ```
   Repeat 2–3 times. Point out: `attention_score` near 0.9, `drift: false`, `rationale: "Stable latency; low errors"`.

#### 3. Show the Focus Snapshot Panel in the UI

1. In the browser, open the LUMO dashboard (`http://localhost:3000`).
2. In the right-side **Agent Panel**, find the **Focus snapshot** card.
3. Enter learner ID: `11111111-1111-1111-1111-111111111111`.
4. Click **Check focus**.
5. **Highlight**: Attention score (high), status "Stable · continue", and that data comes from the backend API.

#### 4. Demonstrate Drift Detection

1. **Send several "bad focus" events** (same session, high latency and wrong answers):
   ```bash
   for i in 1 2 3 4 5; do
     curl -X POST http://localhost:8000/api/v1/analytics/events \
       -H "Content-Type: application/json" \
       -d '{
         "event_type":"question_answered",
         "timestamp":"2025-10-25T19:16:33Z",
         "user_id":"11111111-1111-1111-1111-111111111111",
         "session_id":"SESSION_ID",
         "data":{"response_latency_ms":4000,"is_correct":false}
       }'
   done
   ```

2. Click **Check focus** again in the UI.
3. **Highlight**: Lower attention score, drift status "Drift detected · recap" or "break", and the rationale (e.g., "Slow responses and repeated errors").

#### 5. (Optional) Show Tab Change & Camera Consent

1. Switch to another browser tab for a few seconds, then return to LUMO.
2. Stay idle on the LUMO page for ~30 seconds (no mouse/keyboard).
3. **Highlight**: The optional camera consent prompt and the "Camera check status" line when the presence check runs (if the user has granted permission).

#### 6. Run Tests (Optional)

From `backend/`:

```bash
pytest tests/test_attention_engine.py tests/test_analytics_api.py -v
```

**Highlight**: Unit tests for scoring/drift logic and integration tests for the analytics and attention endpoints.
