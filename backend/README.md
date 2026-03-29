# LUMO Backend API

FastAPI service exposing endpoints for content, sessions, and analytics.

## Quick Start

```bash
# Create virtual environment
uv venv
source .venv/bin/activate  # Windows: .\.venv\Scripts\activate

# Install dependencies
uv pip install -e .

# Copy environment variables
cp .env.example .env

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API will be available at:
- **Base URL**: http://localhost:8000
- **Docs**: http://localhost:8000/api/v1/docs
- **ReDoc**: http://localhost:8000/api/v1/redoc

## API Structure

```
app/
├── main.py              # Application entry point
├── core/
│   ├── config.py       # Configuration management
│   └── database.py     # Database connection
├── api/
│   └── v1/
│       ├── router.py   # Main API router
│       └── endpoints/  # API endpoint modules
│           ├── lessons.py      # Lesson endpoints (Gautam)
│           ├── quizzes.py      # Quiz endpoints (Alshama)
│           ├── feedback.py     # Feedback endpoints (Bhavya)
│           ├── analytics.py    # Analytics endpoints (Nivedita)
│           └── sessions.py     # Session management
├── models/             # Database models (TBD Phase 2)
├── schemas/            # Pydantic schemas (TBD Phase 2)
└── services/           # Business logic
    └── gemini_service.py  # Google Gemini API integration
```

## Environment Variables

Create a `.env` file from `.env.example`:

```env
POSTGRES_USER=lumo
POSTGRES_PASSWORD=lumo_dev_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=lumo

REDIS_HOST=localhost
REDIS_PORT=6379

MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=lumo
MINIO_SECRET_KEY=lumo_dev_password

SECRET_KEY=CHANGE_ME_IN_PRODUCTION

# Google Gemini API (for LLM features)
GEMINI_API_KEY=your-api-key-here
GEMINI_MODEL=gemini-1.5-pro
```

## Development

### Run Tests
```bash
pytest tests/ -v --cov=app
```

### Code Formatting
```bash
black app/
ruff check app/
```

### Type Checking
```bash
mypy app/
```

## Phase 2 Implementation

### Team Responsibilities

**Alshama - Quiz Generation**
- Implement deterministic quiz heuristics
- Create quiz API stub integrated with Postgres
- Handle distractor generation for misconceptions

**Gautam - Lesson Design**
- Implement minimal lesson renderer
- Add accessibility checks
- Prepare micro lesson packs

**Bhavya - Feedback**
- Implement single-level hint loop
- Wire re-quiz trigger behind feature flag
- Connect feedback placeholder to capture error codes

**Nivedita - Analytics**
- Enable event ingestion
- Compute simple latency metrics
- Validate dashboard endpoints

## API Endpoints (Phase 1 - Placeholders)

### Lessons (`/api/v1/lessons`)
- `GET /` - List all lessons
- `GET /{lesson_id}` - Get specific lesson
- `GET /{lesson_id}/render` - Render lesson with accessibility
- `POST /` - Create new lesson

### Quizzes (`/api/v1/quizzes`)
- `POST /generate` - Generate adaptive quiz
- `GET /{quiz_id}` - Get quiz details
- `POST /{quiz_id}/submit` - Submit quiz answers

### Feedback (`/api/v1/feedback`)
- `POST /hint` - Request contextual hint
- `POST /explanation` - Get answer explanation

### Analytics (`/api/v1/analytics`)
- `POST /events` - Ingest user event
- `GET /dashboard/{user_id}` - Get dashboard data
- `GET /attention/{user_id}` - Get attention metrics
- `GET /mastery/{user_id}` - Get mastery scores

### Sessions (`/api/v1/sessions`)
- `POST /` - Create new session
- `POST /{session_id}/end` - End session

## Database Access

The backend uses SQLAlchemy ORM with PostgreSQL.

Schemas:
- `content.*` - Lessons, quizzes, feedback templates
- `events.*` - User events, sessions
- `learner.*` - Users, mastery scores, attention metrics

### Attention & Analytics Pipeline (Phase 1)

The Analytics & Attention agent is integrated into the main backend and works as follows:

1. **Sessions**: A lesson session is created via `POST /api/v1/sessions/`, which inserts a row into `events.sessions`.
2. **Event ingest**: Frontend or other services send `question_answered` events to `POST /api/v1/analytics/events` with:
   - `user_id`, `session_id`
   - `data.response_latency_ms`, `data.is_correct`, and optional `data.idle_ms` / `data.lesson_id`.
3. **Scoring & drift**:
   - The `attention_engine` normalizes latency, error rate, idle time, and variability into an `attention_score` in \[0,1].
   - A short, human-readable `rationale` is generated (for example, “Stable latency; low errors” or “Slow responses and repeated errors”).
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

The response includes `recent` snapshots, `drift`, and a `recommended_action` and is the same data used by the frontend “Focus snapshot” panel.

## LLM Integration

The backend uses Google Gemini API for LLM-powered features. See [GEMINI_SETUP.md](./GEMINI_SETUP.md) for configuration details.

Key features powered by Gemini:
- Quiz question generation with plausible distractors
- Context-aware hint generation
- Personalized feedback messages
- Adaptive learning content

## Next Steps

1. Implement database models (SQLAlchemy)
2. Create Pydantic schemas for request/response validation
3. Implement business logic in service layer
4. Add authentication and authorization
5. Write comprehensive tests
6. Set up Alembic for database migrations
