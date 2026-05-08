# Load testing (Phase 6)

This repo includes a minimal Locust scenario for the analytics pipeline.

## Install

Locust is already included in `backend/pyproject.toml`.

## Run

```bash
cd loadtest
uv run --project ../backend locust -f locustfile.py --host http://localhost:8000
```

Set `API_PREFIX=/api/v1` if needed.

### Dashboard auth (optional)

`/analytics/dashboard/{user_id}` is RBAC-gated. To include dashboard traffic, pass:

```bash
DASHBOARD_BEARER_TOKEN="<jwt>" uv run --project ../backend locust -f locustfile.py --host http://localhost:8000
```

If `DASHBOARD_BEARER_TOKEN` is not set, dashboard requests are skipped.

