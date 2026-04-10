# LUMO — Learning Understanding through Multi-agent Orchestration

> An AI-powered adaptive tutoring platform for K-8 students, built with a multi-agent architecture that personalises lessons, tracks attention, and provides real-time feedback.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2015-000?logo=next.js)](https://nextjs.org)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql)](https://www.postgresql.org)
[![Redis](https://img.shields.io/badge/Cache-Redis-DC382D?logo=redis)](https://redis.io)
[![Gemini](https://img.shields.io/badge/AI-Google%20Gemini-4285F4?logo=google)](https://ai.google.dev)

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Multi-Agent System](#multi-agent-system)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Evaluation Framework](#evaluation-framework)
- [Testing](#testing)
- [Deployment](#deployment)

---

## Overview

LUMO is an intelligent tutoring system that uses a **multi-agent architecture** to deliver personalised, accessible learning experiences for elementary-school students. The platform addresses three core challenges in digital education:

1. **Adaptive Content Generation** — Lessons are dynamically generated using ZPD, BKT, misconception-aware, and hybrid strategies, tailored to each learner's current mastery level.
2. **Real-Time Attention Monitoring** — A lightweight attention engine detects drift via response latency, error rate, and idle time, triggering breaks or interactive recaps.
3. **Closed-Loop Feedback** — Tiered hints (nudge → conceptual → procedural), error explanations, and motivational nudges keep students engaged without revealing answers.

The system is designed for **parent-supervised learning**, where parents create accounts, add student profiles, and can request diagnostic assessments to identify misconceptions.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Next.js Frontend                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Lessons  │ │Dashboard │ │   Auth   │ │ Analytics │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘  │
│       └────────────┴────────────┴──────────────┘        │
│                         │  API Proxy                    │
└─────────────────────────┼───────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────┐
│                   FastAPI Backend                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Planner  │ │ Lesson   │ │ Feedback │ │ Attention │  │
│  │  Agent   │ │ Designer │ │  Agent   │ │  Engine   │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘  │
│       └────────────┴────────────┴──────────────┘        │
│                         │                               │
│  ┌──────────────────────┼────────────────────────────┐  │
│  │              Service Layer                        │  │
│  │  GeminiService · AuthService · DiagnosticService  │  │
│  │  SubjectService · NotificationService · Catalog   │  │
│  └───────────────────────┬───────────────────────────┘  │
└──────────────────────────┼──────────────────────────────┘
                           │
             ┌─────────────┼─────────────┐
             │ PostgreSQL  │    Redis    │
             │ (5 schemas) │  (drift)   │
             └─────────────┴─────────────┘
```

---

## Multi-Agent System

### 1. Planner Agent (`services/planner_service.py`)
The **orchestrator**. Aggregates signals from attention, feedback, and analytics subsystems to recommend the student's next-best-action (continue, review, break, switch to interactive). The HTTP API is `GET /api/v1/planner/recommend/{student_id}`; the student **Learn** dashboard (`/learn`) loads suggestions for the signed-in learner when their account id is a UUID (same id as in the JWT `sub` claim).

### 2. Lesson Designer Agent (`services/generation/`)
Generates age-appropriate, accessible lesson content using four pluggable strategies:
| Strategy | Module | Description |
|----------|--------|-------------|
| **ZPD** | `zpd_strategy.py` | Zone of Proximal Development — scaffolds difficulty |
| **BKT** | `bkt_strategy.py` | Bayesian Knowledge Tracing — probability-based mastery |
| **Misconception** | `misconception_strategy.py` | Targets specific student misconceptions |
| **Hybrid** | `hybrid_strategy.py` | Blends ZPD + BKT + misconception signals |

### 3. Feedback & Motivation Agent (`services/feedback_agent.py`)
Provides three levels of support:
- **Hints** (Level 1–3): Nudge → Conceptual → Procedural, progressively revealing more detail
- **Explanations**: Step-by-step breakdowns when a student answers incorrectly
- **Motivational Nudges**: Encouraging messages triggered when quiz performance drops below 50%

### 4. Attention Engine (`services/attention_engine.py`)
A lightweight attention-tracking pipeline:
- Computes an attention score from response latency, error rate, and idle time
- Detects **attention drift** using a sliding-window approach with Redis state
- Triggers **break suggestions** or **recap activities** when drift is sustained
- Records attention peaks by hour-of-day × day-of-week for optimal scheduling

### 5. Diagnostic Agent (`services/diagnostic_service.py`)
Parent-initiated assessments that probe student misconceptions:
- Generates probing activities from the misconception taxonomy
- Scores responses and identifies weak tags
- Suggests targeted remedial lessons (existing or AI-generated)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript, Tailwind CSS |
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy, Pydantic v2 |
| **Database** | PostgreSQL (5 schemas: `iam`, `learner`, `content`, `events`, `catalog`) |
| **Cache** | Redis (attention drift state, feature windows) |
| **AI** | Gemini or local Ollama (configurable) |
| **Auth** | JWT (bcrypt password hashing, PIN-based student login) |
| **Email** | SMTP with configurable log/smtp delivery modes |
| **Eval** | Custom rubric-based evaluation pipeline |

---

## Project Structure

```
cmpe295-lumo/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/              # Primary API routes
│   │   │   │   ├── auth.py          # Parent/student auth flows
│   │   │   │   ├── feedback.py      # Hint, explanation, motivation
│   │   │   │   ├── lessons.py       # Lesson CRUD, rendering, quiz gen
│   │   │   │   └── planner.py       # Learning path recommendations
│   │   │   └── v1/endpoints/        # Extended API routes
│   │   │       ├── analytics.py     # Attention events, metrics, dashboard
│   │   │       ├── diagnostics.py   # Diagnostic assessment CRUD
│   │   │       ├── evaluation.py    # Strategy comparison metrics
│   │   │       └── sessions.py      # Learning session management
│   │   ├── core/                     # Config, database, dependencies
│   │   ├── models/                   # SQLAlchemy ORM models
│   │   ├── schemas/                  # Pydantic request/response schemas
│   │   ├── services/                 # Business logic layer
│   │   │   ├── generation/           # Lesson generation strategies
│   │   │   ├── attention_engine.py   # Attention scoring + drift
│   │   │   ├── feedback_agent.py     # Feedback & motivation agent
│   │   │   ├── planner_service.py    # Planner orchestrator
│   │   │   ├── diagnostic_service.py # Diagnostic assessments
│   │   │   ├── gemini_service.py     # LLM integration (Gemini)
│   │   │   └── ...
│   │   └── constants/                # Event type constants
│   ├── evaluation/                   # Evaluation framework
│   │   ├── rubrics.py                # Scoring rubrics
│   │   └── run_eval.py               # Evaluation runner
│   ├── migrations/                   # Alembic DB migrations
│   └── tests/                        # pytest test suite
├── frontend/
│   ├── app/                          # Next.js app router pages
│   │   ├── (auth)/                   # Login, register, student login
│   │   ├── (parent)/                 # Parent portal (student mgmt)
│   │   ├── (student)/                # Student learning interface
│   │   ├── dashboard/                # Attention analytics dashboard
│   │   ├── lessons/                  # Lesson list, render, analytics
│   │   └── portal/                   # Parent dashboard portal
│   ├── components/                   # React components
│   │   ├── feedback/                 # FeedbackModal
│   │   ├── lessons/                  # LessonUI (main interactive view)
│   │   └── ui/                       # Shared UI primitives
│   ├── lib/                          # API clients & utilities
│   │   ├── api.ts                    # Base authRequest helper
│   │   ├── analytics-api.ts          # Analytics endpoints
│   │   ├── feedback.ts               # Feedback API client
│   │   ├── lessons.ts                # Lesson/quiz API client
│   │   └── story-studio/             # Story experience generation
│   └── public/                       # Static assets
└── docs/                             # Project workbook & documentation
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Optional Gemini API key, or local Ollama runtime

### Backend Setup

```bash
cd backend

# Create virtual environment
python3.11 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database URL, Redis URL, and LLM settings (Gemini or Ollama)

# Run database migrations
alembic upgrade head

# Start the development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

# Start the development server
npm run dev
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://lumo:lumo@localhost:5432/lumo` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/0` |
| `LLM_PROVIDER` | LLM backend: `gemini` or `ollama` | `ollama` |
| `GEMINI_API_KEY` | Google Gemini API key (when provider is `gemini`) | — |
| `OLLAMA_BASE_URL` | Local Ollama API URL | `http://localhost:11434` |
| `OLLAMA_MODEL` | Ollama model name/tag | `llama3.1:8b` |

**Frontend Story Studio** (Next.js API routes under `/api/story-studio/`): set the same `LLM_PROVIDER`, `OLLAMA_BASE_URL`, and `OLLAMA_MODEL` in `frontend/.env.local` (defaults match local Ollama). Use `LLM_PROVIDER=gemini` and `GEMINI_API_KEY` only when you want Google for story generation, images, or TTS. With Ollama, scene images use placeholders and narration uses browser speech.
| `JWT_SECRET` | Secret key for JWT token signing | `changeme` |
| `AUTO_CREATE_TABLES` | Auto-create DB tables on startup | `true` |
| `ENABLE_GAZE_TELEMETRY` | Enable gaze tracking events | `false` |
| `MAIL_DELIVERY_MODE` | Email delivery: `log` or `smtp` | `log` |

---

## API Reference

All endpoints are served under `/api/v1`.

### Auth (`/api/v1/auth/`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register a parent account |
| POST | `/auth/login` | Parent login (returns JWT) |
| POST | `/auth/students` | Add a student profile |
| POST | `/auth/students/login` | Student PIN login |
| GET  | `/auth/students` | List parent's students |

### Lessons (`/api/v1/lessons/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/lessons` | List all lessons (filter by subject, grade) |
| GET | `/lessons/{id}/render` | Render a lesson with activities |
| POST | `/lessons/{id}/quiz` | Generate a quiz (LLM or mock) |
| GET | `/lessons/analytics/summary` | Lesson analytics summary |
| POST | `/lessons/events` | Log a lesson event |

### Feedback (`/api/v1/feedback/`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/feedback/hint` | Get a tiered hint (level 1–3) |
| POST | `/feedback/explanation` | Get an error explanation |
| POST | `/feedback/motivation` | Get a motivational nudge |
| POST | `/feedback/re-quiz` | Generate a re-quiz question |

### Analytics (`/api/v1/analytics/`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/analytics/events` | Ingest a user event |
| GET | `/analytics/attention/current/` | Current attention status |
| GET | `/analytics/attention/{user_id}` | Attention history |
| GET | `/analytics/attention/peaks/` | Peak attention windows |
| GET | `/analytics/attention/summary/` | Daily attention averages |
| GET | `/analytics/dashboard/{user_id}` | User dashboard data |

### Planner (`/api/v1/planner/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/planner/recommend/{student_id}` | Get learning recommendations |

### Diagnostics (`/api/v1/diagnostics/`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/diagnostics/generate` | Generate a diagnostic assessment |
| GET | `/diagnostics/{id}` | Get assessment details |
| POST | `/diagnostics/{id}/submit` | Submit student responses |
| GET | `/diagnostics/results/{student_id}` | Get all diagnostics for a student |

### Evaluation (`/api/v1/evaluation/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/evaluation/strategy-comparison` | Compare generation strategies |
| GET | `/evaluation/runs` | List recent generation runs |

### Sessions (`/api/v1/sessions/`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/sessions/` | Create a learning session |
| POST | `/sessions/{id}/end` | End a learning session |

---

## Evaluation Framework

The `evaluation/` directory contains a strategy comparison framework:

- **`rubrics.py`** — Defines scoring rubrics (accessibility, engagement, misconception coverage)
- **`run_eval.py`** — Runs all four generation strategies against the same prompt and compares scores

Results are persisted to `content.generation_runs` and queryable via the `/evaluation/strategy-comparison` endpoint.

---

## Testing

```bash
cd backend
source .venv/bin/activate

# Run all tests
pytest tests/ -v

# Run specific test files
pytest tests/test_feedback_api.py -v
pytest tests/test_analytics_api.py -v
pytest tests/test_attention_peaks.py -v
```

---

## Deployment

### Docker (Recommended)

```bash
# Build and start all services
docker-compose up --build

# Services:
# - Backend:  http://localhost:8000
# - Frontend: http://localhost:3000
# - PostgreSQL: localhost:5432
# - Redis: localhost:6379
```

### Manual

1. Set up PostgreSQL and Redis instances
2. Run backend with `uvicorn app.main:app --host 0.0.0.0 --port 8000`
3. Build frontend with `npm run build` and serve with `npm start`

---

## License

This project is developed as part of CMPE 295 — Master's Project at San José State University.

---

## Authors

Built by the LUMO team — Bernardo Flores and collaborators.
