# LUMO

**Learning Understanding through Multi-agent Orchestration**

LUMO is an adaptive tutoring platform for K-8 students. It uses a multi-agent backend to generate lessons, track student attention, and provide real-time feedback -- all tailored to individual learners. Parents create accounts, add student profiles, and can initiate diagnostic assessments to surface misconceptions.

This project was built as part of CMPE 295 (Master's Project) at San Jose State University.

---

## What it does

The platform is organized around five cooperating agents on the backend:

- **Planner Agent** -- Orchestrates the learning path. Pulls signals from attention, feedback, and analytics to recommend what the student should do next: continue a lesson, review something, take a break, or switch to an interactive activity.

- **Lesson Designer** -- Generates age-appropriate lesson content through four pluggable strategies: Zone of Proximal Development (ZPD), Bayesian Knowledge Tracing (BKT), misconception-targeted, and a hybrid that blends all three. Each strategy can be swapped or tuned independently.

- **Feedback Agent** -- Handles three tiers of hints (nudge, conceptual, procedural), step-by-step error explanations, and motivational messages when quiz performance drops.

- **Attention Engine** -- Computes an attention score from response latency, error rate, and idle time. Uses a sliding window over Redis to detect drift. When drift is sustained, the system suggests breaks or recap activities. Also records peak attention windows by time-of-day and day-of-week.

- **Diagnostic Agent** -- Parent-initiated assessments that probe specific misconceptions, score responses, and recommend targeted follow-up lessons.

On the frontend, students get an interactive learning interface with lessons, quizzes, and a "Story Studio" feature that generates narrative-driven learning experiences. Parents get a portal to manage student profiles and view analytics.

---

## Tech stack

| Layer | Details |
|-------|---------|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS, Zustand |
| Backend | Python 3.11+, FastAPI, SQLAlchemy, Pydantic v2 |
| Database | PostgreSQL (schemas: `iam`, `learner`, `content`, `events`, `catalog`) |
| Cache | Redis (attention drift state, sliding windows) |
| Object storage | MinIO (content/assets in Docker setup) |
| AI/LLM | Google Gemini or local Ollama (configurable per environment) |
| Auth | Session cookies with bcrypt password hashing; email-code login for students |
| Testing | pytest (backend), Vitest + Playwright (frontend) |

---

## Project layout

```
backend/
  app/
    api/
      routes/           auth, feedback, lessons, planner
      v1/endpoints/     analytics, diagnostics, evaluation, sessions
    core/               config, database setup, dependency injection
    models/             SQLAlchemy ORM models
    schemas/            Pydantic request/response schemas
    services/
      generation/       lesson generation strategies (zpd, bkt, misconception, hybrid)
      attention_engine.py
      feedback_agent.py
      planner_service.py
      diagnostic_service.py
      gemini_service.py
      pii_redaction.py
      ...
    constants/          event type definitions
  evaluation/           rubric-based strategy comparison framework
  tests/                pytest suite

database/
  init/                 SQL bootstrap scripts (run by Docker on first start)

frontend/
  app/
    (auth)/             login, register, student-login
    (parent)/           parent portal, student management
    (student)/          student learning interface
    api/story-studio/   story experience generation routes
    dashboard/          attention analytics
    lessons/            lesson list, individual lesson view, analytics
    portal/             parent dashboard
  components/
    attention/          attention tracking UI
    feedback/           feedback modal
    lessons/            main interactive lesson view
    story-studio/       narrative learning experience components
  lib/                  API clients, auth helpers, state management
```

---

## Getting started

### Prerequisites

- Python 3.11 or later
- Node.js 18 or later
- PostgreSQL 14+
- Redis 7+
- A Google Gemini API key, or a running Ollama instance for local LLM inference

### Backend

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -e .
```

There's a `.env.example` in the repo root you can copy from. Create a `.env` file in `backend/` with at least:

```
DATABASE_URL=postgresql+psycopg://lumo:lumo@localhost:5432/lumo_auth
REDIS_URL=redis://localhost:6379/0
LLM_PROVIDER=gemini        # or "ollama" for local
GEMINI_API_KEY=your-key     # only needed when LLM_PROVIDER=gemini
JWT_SECRET=pick-something-random
```

The database schema is bootstrapped by SQL scripts in `database/init/` (these run automatically when using Docker Compose). Tables can also be auto-created on startup via SQLAlchemy when `AUTO_CREATE_TABLES=true`. Start the server:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
```

Create a `.env.local` file:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

If you want Story Studio to use Gemini for story generation, image prompts, and narration, also set `LLM_PROVIDER=gemini` and `GEMINI_API_KEY` in `.env.local`. Otherwise it defaults to Ollama with placeholder images and browser-based speech.

```bash
npm run dev
```

The frontend runs on `http://localhost:3000` and proxies API requests to the backend.

### Other environment variables

| Variable | What it does | Default |
|----------|-------------|---------|
| `OLLAMA_BASE_URL` | Ollama API endpoint | `http://localhost:11434` |
| `OLLAMA_MODEL` | Which Ollama model to use | `llama3.1:8b` |
| `AUTO_CREATE_TABLES` | Create DB tables on startup | `true` |
| `SESSION_COOKIE_NAME` | Name for the session cookie | `lumo_session` |
| `SESSION_COOKIE_SECURE` | Secure flag on session cookies | `false` |
| `BACKEND_CORS_ORIGINS` | Allowed CORS origins | `http://localhost:3000` |
| `ENABLE_GAZE_TELEMETRY` | Enable gaze tracking events | `false` |
| `MAIL_DELIVERY_MODE` | `log` (print to console) or `smtp` | `log` |
| `MINIO_ENDPOINT` | MinIO/S3 endpoint | `minio:9000` |
| `MINIO_ACCESS_KEY` | MinIO access key | -- |
| `MINIO_SECRET_KEY` | MinIO secret key | -- |

---

## API overview

All endpoints live under `/api/v1`. Here's a summary of the main route groups:

**Auth** (`/auth/`) -- Register parent accounts, login (returns JWT), add student profiles, student PIN login.

**Lessons** (`/lessons/`) -- List and filter lessons by subject/grade, render a lesson with activities, generate quizzes, log lesson events, view analytics summaries.

**Feedback** (`/feedback/`) -- Request tiered hints (levels 1-3), error explanations, motivational nudges, and re-quiz questions.

**Analytics** (`/analytics/`) -- Ingest user events, query current attention status, attention history, peak attention windows, daily averages, and per-user dashboard data.

**Planner** (`/planner/`) -- Get next-step recommendations for a student.

**Diagnostics** (`/diagnostics/`) -- Generate diagnostic assessments, retrieve results, submit student responses.

**Evaluation** (`/evaluation/`) -- Compare lesson generation strategies side by side, list recent generation runs.

**Sessions** (`/sessions/`) -- Create and end learning sessions.

---

## Evaluation framework

The `backend/evaluation/` directory has a strategy comparison pipeline. `rubrics.py` defines scoring criteria (accessibility, engagement, misconception coverage) and `run_eval.py` runs all four generation strategies against the same prompt to compare output quality. Results are stored in the `content.generation_runs` table and exposed through the `/evaluation/strategy-comparison` endpoint.

---

## Running tests

Backend tests use pytest:

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v
```

There are test files covering auth, lessons, feedback, analytics, attention peaks, PII redaction, quiz adaptivity, and planner micro-recaps.

Frontend tests use Vitest (unit) and Playwright (e2e):

```bash
cd frontend
npm run test              # vitest unit tests
npm run test:e2e:auth     # playwright auth flow tests
```

---

## Deployment

### Docker Compose

The easiest way to get everything running:

```bash
docker-compose up --build
```

This starts PostgreSQL 16, Redis 7, MinIO (object storage), the backend, and the frontend. The `database/init/` SQL scripts run on first launch to set up the schema. Services are available at:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- MinIO console: `http://localhost:9001`

If you're using Ollama locally, it's accessed from inside the containers via `host.docker.internal:11434`.

### Manual

1. Provision PostgreSQL and Redis (and optionally MinIO).
2. Run the SQL scripts from `database/init/` against your database, or set `AUTO_CREATE_TABLES=true`.
3. Run the backend: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
4. Build the frontend: `npm run build`, then serve with `npm start`.

---

## Authors

Bernardo Flores, Gautam Thampy, Bhavya Jain, Nivedita Nair
