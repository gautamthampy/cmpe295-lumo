import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import Base, engine, SessionLocal
from app.models.attention import AttentionMetric


@pytest.fixture
def client():
    return TestClient(app)


def _random_user_id() -> str:
    return str(uuid.uuid4())


def test_create_session_and_log_event_success(client):
    user_id = _random_user_id()

    # Create a real session
    res = client.post(
        "/api/v1/sessions/",
        json={"user_id": user_id, "device_type": "web", "user_agent": "pytest"},
    )
    assert res.status_code == 200
    session_id = res.json()["session_id"]

    # Log a question_answered event
    timestamp = "2025-10-25T19:15:33Z"  # Saturday (5), 19:15 UTC -> hour_of_day = 19
    event = {
        "event_type": "question_answered",
        "timestamp": timestamp,
        "user_id": user_id,
        "session_id": session_id,
        "data": {
            "question_id": str(uuid.uuid4()),
            "lesson_id": str(uuid.uuid4()),
            "response_latency_ms": 900,
            "is_correct": True,
        },
    }
    res = client.post("/api/v1/analytics/events", json=event)
    assert res.status_code == 202
    body = res.json()
    assert "attention_score" in body
    assert "drift" in body
    assert "recommended_action" in body
    assert body.get("rationale")

    # Confirm a row was written to learner.attention_metrics
    with SessionLocal() as db:
        rows = (
            db.query(AttentionMetric)
            .filter(AttentionMetric.user_id == uuid.UUID(user_id))
            .order_by(AttentionMetric.recorded_at.asc())
            .all()
        )
        assert len(rows) >= 1
        last = rows[-1]
        assert last.session_id == uuid.UUID(session_id)
        # Check time bucketing fields derived from the event timestamp (UTC).
        assert last.hour_of_day == 19
        # 2025-10-25 is a Saturday -> Python weekday() = 5
        assert last.day_of_week == 5


def test_log_event_unknown_session_400(client):
    user_id = _random_user_id()
    bad_session_id = str(uuid.uuid4())

    event = {
        "event_type": "question_answered",
        "timestamp": "2025-10-25T19:15:33Z",
        "user_id": user_id,
        "session_id": bad_session_id,
        "data": {
            "question_id": str(uuid.uuid4()),
            "lesson_id": str(uuid.uuid4()),
            "response_latency_ms": 900,
            "is_correct": True,
        },
    }
    res = client.post("/api/v1/analytics/events", json=event)
    assert res.status_code == 400
    assert "Unknown session_id" in res.json()["detail"]


def test_attention_summary_endpoint(client):
    user_id = _random_user_id()

    # Create session and log two events so we have some history.
    res = client.post(
        "/api/v1/sessions/",
        json={"user_id": user_id, "device_type": "web", "user_agent": "pytest"},
    )
    assert res.status_code == 200
    session_id = res.json()["session_id"]

    for latency, correct in [(900, True), (4000, False)]:
        event = {
            "event_type": "question_answered",
            "timestamp": "2025-10-25T19:15:33Z",
            "user_id": user_id,
            "session_id": session_id,
            "data": {
                "question_id": str(uuid.uuid4()),
                "lesson_id": str(uuid.uuid4()),
                "response_latency_ms": latency,
                "is_correct": correct,
            },
        }
        res = client.post("/api/v1/analytics/events", json=event)
        assert res.status_code == 202

    res = client.get(f"/api/v1/analytics/attention/{user_id}")
    assert res.status_code == 200
    body = res.json()
    assert body["user_id"] == user_id
    assert isinstance(body["recent"], list)
    assert len(body["recent"]) >= 2
    assert "drift" in body
    assert "recommended_action" in body

