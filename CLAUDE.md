# LUMO — Claude Code Project Memory

## Project Overview

**LUMO** is a multi-agent AI study coach for Grade 3 elementary math education.
Built as an SJSU CMPE 295 capstone project.

### Four Specialized Agents

| Agent | Owner | Status |
|---|---|---|
| **Lesson Designer** | Gautam | Phase 3 active |
| Quiz Agent | Alshama | Phase 2 |
| Feedback Agent | Bhavya | Phase 2 |
| Attention Agent | Nivedita | Phase 2 |

---

## Architecture

```
frontend/          Next.js 15 App Router · TypeScript · Tailwind CSS v3
backend/           FastAPI · SQLAlchemy · Pydantic v2 · Python 3.11
database/init/     PostgreSQL init SQL (run via docker-compose)
```

**External services:** PostgreSQL, Redis, MinIO (all via docker-compose), Google Gemini (optional).

### Frontend structure (important)

- `frontend/app/` — **our working app** (Tailwind v3, `@layer components`)
- `frontend/src/` — UI prototype from `UI-changes-v1` branch (Tailwind v4 `@utility` syntax). Do NOT modify — it's reference only.
- Path alias: `@/*` → `frontend/*` (tsconfig `paths`)

---

## Branching Strategy

```
main ──── dev ──── gautam/lesson-designer-v{n}
```

- Merge `main → dev` when upstream changes land (e.g. UI changes)
- Merge `dev → feature-branch` to keep in sync
- Feature branches named `{name}/component-v{n}`
- Open PRs from feature branch → `main`

---

## Lesson Designer Component

### What's built and works

- **MDX Renderer** (`backend/app/services/mdx_renderer.py`)
  - `render(mdx)` → semantic HTML via markdown-it-py
  - `render_adaptive(mdx, mastery_score)` → shows/hides `<!-- scaffold -->`/`<!-- advanced -->` blocks
  - Strips JSX-style tags, preserves HTML comments

- **Accessibility Checker** (`backend/app/services/accessibility_checker.py`)
  - 10 deterministic WCAG 2.1 AA rules, returns score 0.0–1.0
  - Rules: heading structure, alt text, reading level, color contrast hints, landmark presence, etc.

- **Lesson endpoints** (`backend/app/api/v1/endpoints/lessons.py`)
  - `GET  /lessons` — list all lessons
  - `GET  /lessons/{id}` — get by ID
  - `POST /lessons` — create (status=draft)
  - `POST /lessons/preview` — render MDX→HTML + a11y score without saving (used by MdxEditor)
  - `POST /lessons/generate` — AI generation via Gemini (stub fallback if API key not set)
  - `GET  /lessons/{id}/render` — render with adaptive content + quiz context + next_lesson_id
  - `POST /lessons/{id}/publish` — publish guardrail (requires score ≥ 0.8)
  - `POST /lessons/{id}/revise` — create a new version (parent_version_id chain)
  - `GET  /lessons/accessibility-report` — audit all active lessons
  - `GET  /lessons/analytics/summary` — per-lesson engagement metrics (demo-seeded)

- **Sequencing:** `prerequisites UUID[]` on lessons, two-pass seeding, `next_lesson_id` auto-discovered via `Lesson.prerequisites.contains([lesson_id])`

- **Seed data** (`backend/app/seed/`) — 5 Grade 3 Math lessons with prerequisite chains

- **Frontend pages**
  - `/lessons` — grid and learning-path toggle, analytics + editor links
  - `/lessons/[lessonId]` — LessonViewer + adaptive quiz with 70% pass threshold + "Next Lesson" link
  - `/lessons/editor` — AI-assisted authoring with MdxEditor live preview
  - `/lessons/analytics` — per-lesson engagement dashboard

- **Components**
  - `LessonViewer` — accessible sectioned reader, progress tracking
  - `LearningPath` — BFS-ordered prerequisite graph
  - `MdxEditor` — side-by-side MDX + rendered HTML preview via `POST /lessons/preview`

- **Tests** — 71 passing unit tests in `backend/tests/` covering renderer, checker, API, schemas

### Known limitations

- No real event data — analytics uses deterministic mock values seeded from lesson UUIDs
- No actual auth — hardcoded demo user UUID (`00000000-0000-0000-0000-000000000001`)
- Gemini integration requires `GEMINI_API_KEY` env var; falls back to stub MDX template without it
- `prerequisites_met` is always `true` — mastery data from Nivedita's agent not yet wired in
- No frontend component tests (Playwright/Jest)

### Design decisions

| Decision | Rationale |
|---|---|
| markdown-it-py for MDX→HTML | Pure Python, no Node subprocess. MDX JSX tags stripped with regex. |
| 10-rule deterministic checker | Testable, fast, no external a11y service. Rules map directly to WCAG 2.1 AA SCs. |
| Publish guardrail at score ≥ 0.8 | Enforces accessibility before content reaches students. |
| scaffold/advanced blocks via HTML comments | Zero MDX spec deviation. Comments are invisible in rendered output. |
| Two-pass seeding | Avoids FK order dependency; `db.flush()` gets IDs before wiring prerequisites. |
| Demo analytics from seeded RNG | Stable across requests (seeded from UUID), realistic-looking values for demo. |

---

## How to Run Locally

### 1. Infrastructure

```bash
docker-compose up -d    # PostgreSQL + Redis + MinIO
```

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m app.seed.seed_db     # seed 5 lessons
uvicorn app.main:app --reload  # runs on :8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev   # runs on :3000
```

### 4. Environment variables (optional)

```
GEMINI_API_KEY=...   # enables real AI generation; stub used without it
```

---

## Test Commands

```bash
# Backend unit tests (71 tests)
cd backend && pytest backend/tests/ -v

# TypeScript type check
cd frontend && npx tsc --noEmit

# Run a specific test file
pytest backend/tests/test_mdx_renderer.py -v
```

---

## API Base URL

Frontend reads `NEXT_PUBLIC_API_URL` (default `http://localhost:8000/api/v1`).
Set this in `frontend/.env.local` to point at a deployed backend.
