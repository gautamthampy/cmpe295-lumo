# LUMO Auth Foundations

This repository currently contains the first implementation slice for the LUMO parent authentication experience.

## Stack

- Frontend: Next.js 15, React 19, TypeScript, Tailwind CSS, MDX-ready configuration
- Backend: FastAPI, Python 3.11+, PostgreSQL, Redis
- Infrastructure: Docker Compose for local PostgreSQL and Redis

## Current Scope

- Sign in
- Sign up
- Forgot password request
- Forgot password confirmation
- Reset password completion
- Verification prompt
- Initial FastAPI auth module scaffold
- Initial PostgreSQL auth schema
- Living design document at the repo root

## Structure

- `frontend/` - Next.js auth application
- `backend/` - FastAPI auth service scaffold
- `database/init/` - SQL bootstrap schema
- `DESIGN.md` - living implementation-facing design document
- `stitch_remix_of_forgot_password_parent_portal/` - original design artifacts

## Local Setup

### Fastest Manual Run

If you want to run the current auth application end to end before pushing, you do not need Docker for the auth slice.

Use two PowerShell terminals from the repo root.

Terminal 1: backend

```powershell
Set-Location .\backend
$env:DATABASE_URL="sqlite:///./local-auth.db"
$env:JWT_SECRET="replace-this-with-a-long-local-dev-secret"
$env:AUTO_CREATE_TABLES="true"
$env:APP_BASE_URL="http://127.0.0.1:3000"
$env:BACKEND_CORS_ORIGINS="http://127.0.0.1:3000,http://localhost:3000"
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Terminal 2: frontend

```powershell
Set-Location .\frontend
$env:NEXT_PUBLIC_API_BASE_URL="http://127.0.0.1:8000/api/v1"
$env:SESSION_COOKIE_NAME="lumo_session"
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Then open:

1. `http://127.0.0.1:3000/sign-in`
2. `http://127.0.0.1:3000/sign-up`
3. `http://127.0.0.1:3000/forgot-password`
4. `http://127.0.0.1:3000/student-login`

This path matches the currently implemented parent-auth experience and uses a local SQLite database file at `backend/local-auth.db`.

### SSL Certificates

If your environment requires corporate PKI trust to install Node or Python packages, load the repo-local certificate bundles before installing dependencies:

1. `PowerShell -ExecutionPolicy Bypass -File .\scripts\use-repo-certs.ps1`
2. Keep using that shell for `npm install`, `uv sync`, and any other package-install commands.

The script points Node, npm, and Python tooling at the certificate bundles stored in `certs/`.

### Frontend

1. `cd frontend`
2. `npm install`
3. `npm run dev`
4. `npm run test`
5. `npm run test:e2e:auth`

If Playwright needs to download browsers in your environment, do it from the same repo-cert-enabled PowerShell session used for `npm install` so browser downloads trust the corporate PKI chain as well.
The auth smoke suite self-hosts the frontend on `127.0.0.1:3100` and the backend on `127.0.0.1:8100` so it does not accidentally attach to any already-running local dev servers. When a local Chrome or Edge install is present, the suite uses that browser automatically; otherwise it falls back to the normal Playwright-managed browser bundle.

### Backend

1. Install Python 3.11+ or use `uv`
2. `cd backend`
3. `uv sync`
4. `uv run uvicorn app.main:app --reload`
5. `uv run pytest`

### Full Validation Before Push

From the current repo state, these are the commands that should pass before you push:

1. `cd backend && uv run pytest`
2. `cd frontend && npm run test`
3. `cd frontend && npm run typecheck`
4. `cd frontend && npm run build`
5. `cd frontend && npm run test:e2e:auth`

The broader legacy Playwright suite under `frontend/e2e/` is not aligned with the current auth-only surface yet, so it should not be treated as a release gate until it is updated or removed.

### Infrastructure

1. `docker compose up -d postgres redis`

## Notes

- Social sign-in is intentionally excluded from V1.
- Email verification gates access in V1.
- The implementation-facing design document must be updated together with any new screen or backend-visible UX change.
- In this repo, SSL-sensitive dependency installs should use the certificate bundles in `certs/` rather than machine-specific missing PEM files.
- `/portal` now enforces a real backend session check instead of acting as a public placeholder.
- The frontend ships with a dedicated auth smoke suite under `frontend/e2e-auth/` that runs against the live frontend and backend together.
- GitHub Actions CI now runs frontend typechecking, frontend integration tests, backend tests, production build verification, and the auth end-to-end smoke flow.

