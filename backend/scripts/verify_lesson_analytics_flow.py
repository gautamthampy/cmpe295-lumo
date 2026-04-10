#!/usr/bin/env python3
"""
End-to-end API verification of the lesson → analytics → attention → dashboard chain.

Mirrors the frontend flow in frontend/components/lessons/lesson-ui.tsx for a valid
student UUID: session create, analytics ingest (lesson_started, quiz_started,
question_answered, quiz_completed, lesson_completed), lesson UserEvents for dashboard
counts, then GET dashboard and attention summary.

Run from repo backend directory:
  .venv/bin/python scripts/verify_lesson_analytics_flow.py

Requires the same DATABASE_URL / Redis setup as the running app (or in-memory sqlite
if your .env points there). Uses TestClient; no browser or uvicorn required.
"""
from __future__ import annotations

import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

backend_root = Path(__file__).resolve().parent.parent
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


def _ts() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def main() -> int:
    client = TestClient(app)
    user_id = str(uuid.uuid4())
    lesson_id = "MATH_G2_M1_L1"
    quiz_id = str(uuid.uuid4())
    errors: list[str] = []

    def post_json(path: str, body: dict) -> tuple[int, dict]:
        r = client.post(path, json=body)
        try:
            data = r.json() if r.content else {}
        except Exception:
            data = {"_raw": r.text}
        return r.status_code, data if isinstance(data, dict) else {"_raw": data}

    # 1) Session
    code, sess = post_json(
        "/api/v1/sessions/",
        {"user_id": user_id, "device_type": "web", "user_agent": "verify_lesson_analytics_flow"},
    )
    if code != 200:
        print(f"FAIL POST /sessions/ -> {code} {sess}", file=sys.stderr)
        return 1
    session_id = sess.get("session_id")
    if not session_id:
        print(f"FAIL no session_id in {sess}", file=sys.stderr)
        return 1

    def ingest(event_type: str, data: dict) -> tuple[int, dict]:
        return post_json(
            "/api/v1/analytics/events",
            {
                "event_type": event_type,
                "timestamp": _ts(),
                "user_id": user_id,
                "session_id": session_id,
                "data": data,
            },
        )

    # 2) lesson_started
    c, b = ingest(
        "lesson_started",
        {
            "lesson_id": lesson_id,
            "lesson_title": "Verify flow lesson",
            "subject": "Mathematics",
            "grade_level": 2,
        },
    )
    if c != 202:
        errors.append(f"lesson_started expected 202 got {c}: {b}")

    # 3) quiz_started
    c, b = ingest(
        "quiz_started",
        {"quiz_id": quiz_id, "lesson_id": lesson_id, "question_count": 2},
    )
    if c != 202:
        errors.append(f"quiz_started expected 202 got {c}: {b}")

    # 4) question_answered (drives attention pipeline)
    for i, (lat, ok) in enumerate([(1200, True), (3500, False)], start=1):
        c, b = ingest(
            "question_answered",
            {
                "question_id": f"verify-q{i}",
                "answer": "a" if ok else "b",
                "is_correct": ok,
                "response_latency_ms": lat,
                "lesson_id": lesson_id,
            },
        )
        if c != 202:
            errors.append(f"question_answered {i} expected 202 got {c}: {b}")
        elif "attention_score" not in b:
            errors.append(f"question_answered {i} missing attention_score: {b}")

    # 5) quiz_completed + lesson_completed (analytics stream)
    c, b = ingest(
        "quiz_completed",
        {
            "quiz_id": quiz_id,
            "score": 1,
            "total_questions": 2,
            "time_spent_ms": 8000,
            "lesson_id": lesson_id,
        },
    )
    if c != 202:
        errors.append(f"quiz_completed expected 202 got {c}: {b}")

    c, b = ingest(
        "lesson_completed",
        {"lesson_id": lesson_id, "time_spent_ms": 600_000},
    )
    if c != 202:
        errors.append(f"lesson_completed expected 202 got {c}: {b}")

    # 6) UserEvent rows for dashboard (same shape as lesson-ui logLessonEvent)
    base = {"user_id": user_id, "session_id": session_id, "lesson_id": lesson_id}
    for ev, extra in [
        ("quiz_submit", {"answers": {}, "quiz_score": 1, "quiz_total": 2}),
        ("quiz_completed", {"quiz_score": 1, "quiz_total": 2}),
        ("lesson_completed", {"quiz_score": 1, "quiz_total": 2}),
    ]:
        r = client.post("/api/v1/lessons/events", json={"event": ev, **base, **extra})
        if r.status_code != 200:
            errors.append(f"lessons/events {ev} -> {r.status_code} {r.text}")

    # 7) Dashboard + attention
    dash = client.get(f"/api/v1/analytics/dashboard/{user_id}")
    if dash.status_code != 200:
        errors.append(f"dashboard -> {dash.status_code} {dash.text}")
    else:
        dj = dash.json()
        if dj.get("quizzes_taken", 0) < 1 or dj.get("lessons_completed", 0) < 1:
            errors.append(f"dashboard counts unexpected: {dj}")
        if dj.get("overall_mastery", 0) <= 0:
            errors.append(f"dashboard expected overall_mastery > 0 after quiz_completed: {dj}")
        if "time_per_concept" not in dj:
            errors.append("dashboard missing time_per_concept key")

    attn = client.get(f"/api/v1/analytics/attention/{user_id}")
    if attn.status_code != 200:
        errors.append(f"attention -> {attn.status_code} {attn.text}")

    out = {
        "user_id": user_id,
        "session_id": session_id,
        "dashboard": dash.json() if dash.status_code == 200 else None,
        "attention_ok": attn.status_code == 200,
        "errors": errors,
    }
    print(json.dumps(out, indent=2))

    if errors:
        for e in errors:
            print(e, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
