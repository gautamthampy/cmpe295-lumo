# LUMO: A Multi-agent AI Study Coach

LUMO is an intelligent tutoring system designed for elementary education, combining multi-agent AI architecture with attention-aware learning and mastery-based progression.

## Project Overview

LUMO addresses the limitations of traditional one-size-fits-all teaching by providing personalized, adaptive learning experiences through specialized AI agents:

- **Lesson Designer Agent**: Creates contextualized, age-appropriate lessons
- **Quiz Agent**: Generates adaptive quizzes with trap-based distractors
- **Feedback Agent**: Provides tiered hints and motivational support
- **Attention Agent**: Monitors engagement and optimizes learning sessions

## Architecture

### Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, MDX
- **Backend**: FastAPI (Python 3.11+), PostgreSQL, Redis, MinIO
- **Infrastructure**: Docker Compose, uv (Python), npm

### Components

```
lumo/
├── backend/           # FastAPI service (content, sessions, analytics)
├── frontend/          # Next.js web app (lesson, quiz, feedback interfaces)
├── experimental/      # SOTA baseline reproduction and simulations
├── database/          # PostgreSQL schemas and initialization
├── contracts/         # API contracts and event schemas
└── docs/              # Documentation
```

## Getting Started

### Prerequisites

- **Docker & Docker Compose**: For running databases
- **Python 3.11+**: For backend development
- **Node.js 18+**: For frontend development
- **uv**: Python package manager (`pip install uv`)
- **npm**: Node package manager

### Environment Setup

#### 1. Clone the Repository

```bash
git clone <repository-url>
cd cmpe295-lumo
```

#### 2. Start Infrastructure Services

```bash
# Start PostgreSQL, MinIO, and Redis
docker-compose up -d

# Verify services are running
docker-compose ps
```

The following services will be available:
- **PostgreSQL**: `localhost:5432`
- **MinIO Console**: `http://localhost:9001` (UI)
- **MinIO API**: `localhost:9000`
- **Redis**: `localhost:6379`

Default credentials (development only):
- Username: `lumo`
- Password: `lumo_dev_password`

#### 3. Backend Setup

```bash
cd backend

# Create virtual environment with uv
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
uv pip install -e .

# Copy environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations (when Alembic is configured)
# alembic upgrade head

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: `http://localhost:8000`
API Documentation: `http://localhost:8000/api/v1/docs`

#### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local

# Start development server
npm run dev
```

Frontend will be available at: `http://localhost:3000`

## Database Schema

The database is organized into three schemas:

### 1. Content Schema
- **lessons**: Lesson metadata and MDX content
- **quiz_questions**: Quiz questions with distractors
- **feedback_templates**: Hint and feedback templates

### 2. Events Schema
- **user_events**: All user interactions (auto-anonymized after 90 days)
- **sessions**: Session tracking

### 3. Learner Model Schema
- **users**: User profiles (minimal PII)
- **mastery_scores**: Concept mastery tracking
- **attention_metrics**: Attention and engagement data

## API Contracts

API contracts are defined in `contracts/api_contracts.yaml` (OpenAPI 3.0 spec).

Key endpoints:
- `GET /api/v1/lessons`: List all lessons
- `POST /api/v1/quizzes/generate`: Generate adaptive quiz
- `POST /api/v1/feedback/hint`: Request contextual hint
- `POST /api/v1/analytics/events`: Ingest user event
- `GET /api/v1/analytics/dashboard/{user_id}`: Get dashboard data

## Event Schema

All user interactions conform to `contracts/event_schema.json`.

Event types:
- `lesson_started`, `lesson_completed`
- `quiz_started`, `question_answered`, `quiz_completed`
- `hint_requested`, `feedback_provided`
- `attention_drift_detected`, `break_suggested`
- `re_quiz_triggered`

## Privacy & Data Protection

See `contracts/PRIVACY_GUARDRAILS.md` for comprehensive privacy policies.

Key principles:
- **Data Minimization**: Collect only necessary data
- **Consent**: Explicit opt-in for tracking features
- **Retention**: 90-day default with auto-anonymization
- **Transparency**: Clear dashboards showing data collection
- **No PII in LLM prompts**: Sanitize all external API calls

## Development Workflow

### Phase 1: Environment and Contracts ✅
- [x] Docker Compose setup
- [x] Database schema definition
- [x] Event schema and API contracts
- [x] Privacy guardrails
- [x] Backend structure (FastAPI)
- [x] Frontend structure (Next.js)

### Phase 2: Baseline Reproduction (Current)
**Team Deliverables:**
- **Alshama**: Deterministic quiz heuristics + Postgres API stub
- **Gautam**: Minimal lesson renderer + accessibility checks
- **Bhavya**: Single-level hint loop + re-quiz trigger (flagged)
- **Nivedita**: Event ingestion + simple latency metrics + dashboard validation

### Phase 3: Vertical Workflow
- Integrate renderer with quiz engine and logging
- Prepare micro lesson packs
- Finalize lesson-to-quiz handoff contracts

### Phase 4: Closed Loop with Feedback
- Adaptive hints by error type
- Initial attention scoring
- Simple break scheduler

### Phase 5: Analytics & Privacy
- Dashboard views with materialized metrics
- Privacy review completion

### Phase 6: Verification & Validation
- Unit and integration tests
- Usability checks
- Load testing
- Demo preparation

## Testing

### Backend Tests
```bash
cd backend
pytest tests/ --cov=app
```

### Frontend Tests
```bash
cd frontend
npm test
```

## Documentation

### Technical Diagrams

Comprehensive system diagrams are available in [`docs/DIAGRAMS.md`](docs/DIAGRAMS.md):
- System architecture (multi-agent AI, service layers)
- Database entity-relationship diagrams
- API sequence diagrams (lesson, quiz, attention workflows)
- Component architecture (backend & frontend)
- Data flow diagrams (event processing, quiz generation, feedback loops)
- Deployment architecture (development & production)
- Privacy and data flow architecture

All diagrams use **Mermaid** syntax and can be viewed directly in GitHub or any Mermaid-compatible viewer.

### Other Documentation

- **API Contracts**: [`docs/api_contracts.yaml`](docs/api_contracts.yaml) - OpenAPI 3.0 specification
- **Event Schema**: [`docs/event_schema.json`](docs/event_schema.json) - JSON Schema for cross-component events
- **Privacy Guardrails**: [`docs/PRIVACY_GUARDRAILS.md`](docs/PRIVACY_GUARDRAILS.md) - COPPA, FERPA, GDPR compliance
- **Setup Guide**: [`docs/SETUP_GUIDE.md`](docs/SETUP_GUIDE.md) - Detailed environment setup
- **Phase 1 Report**: [`PHASE1_COMPLETION.md`](PHASE1_COMPLETION.md) - Phase 1 completion status

## Code Attribution

All code follows open-source best practices and properly cites external sources. See `ATTRIBUTIONS.md` for detailed citations of:
- Framework documentation and patterns
- Third-party library licenses
- Industry standards and best practices
- Academic research references

## Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Follow coding standards (Black for Python, ESLint for TypeScript)
3. Write tests for new features
4. Update documentation and attributions
5. Submit pull request to `dev` branch

## Team Members

- **Gautam Santhanu Thampy**: Lesson Design & Generation
- **Bhavya Jain**: Feedback & Motivation
- **Alshama Mony Sheena**: Quiz Generation
- **Nivedita Nair**: Analytics & Attention

**Advisor**: Bernardo Flores

## License

[To be determined]

## Resources

- Project Schedule: [Monday.com Board](https://sjsu357034.monday.com/boards/18061322265)
- Documentation: `docs/`
- API Docs: http://localhost:8000/api/v1/docs (when running)

## Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# View logs
docker-compose logs postgres

# Restart service
docker-compose restart postgres
```

### Port Conflicts
If ports 5432, 8000, or 3000 are already in use:
1. Stop conflicting services
2. Or modify port mappings in `docker-compose.yml` and `.env` files

### MinIO Access Issues
Access MinIO console at `http://localhost:9001` to:
- Create buckets
- Upload content
- Manage access policies

## Support

For questions or issues:
- Create GitHub issue
- Contact team via project communication channels
