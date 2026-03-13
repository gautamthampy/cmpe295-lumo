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
