import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import Base, engine, SessionLocal
from app.models.attention import AttentionMetric
from app.models.events import UserEvent
from app.models.lesson import Lesson  # ensure content.lessons is in metadata for FKs


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
            # Use null lesson_id here so we don't depend on seeded lessons.
            "lesson_id": None,
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

        # Confirm a raw event was written to events.user_events
        event_rows = (
            db.query(UserEvent)
            .filter(
                UserEvent.user_id == uuid.UUID(user_id),
                UserEvent.session_id == uuid.UUID(session_id),
                UserEvent.event_type == "question_answered",
            )
            .all()
        )
        assert len(event_rows) >= 1


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


def test_current_attention_endpoint_with_history(client):
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
                # Use null lesson_id here so we don't depend on seeded lessons.
                "lesson_id": None,
                "response_latency_ms": latency,
                "is_correct": correct,
            },
        }
        res = client.post("/api/v1/analytics/events", json=event)
        assert res.status_code == 202

    res = client.get(
        f"/api/v1/analytics/attention/current/?user_id={user_id}&session_id={session_id}"
    )
    assert res.status_code == 200
    body = res.json()
    assert body["user_id"] == user_id
    assert body["session_id"] == session_id
    assert "attention_score" in body
    assert "drift" in body
    assert "recommended_action" in body
    assert "rationale" in body


def test_current_attention_endpoint_without_history(client):
    user_id = _random_user_id()

    # Create a session but do not log any attention events.
    res = client.post(
        "/api/v1/sessions/",
        json={"user_id": user_id, "device_type": "web", "user_agent": "pytest"},
    )
    assert res.status_code == 200
    session_id = res.json()["session_id"]

    res = client.get(
        f"/api/v1/analytics/attention/current/?user_id={user_id}&session_id={session_id}"
    )
    assert res.status_code == 200
    body = res.json()
    assert body["user_id"] == user_id
    assert body["session_id"] == session_id
    # With no history we default to stable attention.
    assert body["attention_score"] == 1.0
    assert body["drift"] is False
    assert body["recommended_action"] == "continue"


def test_ingest_various_event_types_accepted(client):
    """Ensure /analytics/events accepts the event types defined in event_schema.json."""
    user_id = _random_user_id()

    # Create a real session for the user
    res = client.post(
        "/api/v1/sessions/",
        json={"user_id": user_id, "device_type": "web", "user_agent": "pytest"},
    )
    assert res.status_code == 200
    session_id = res.json()["session_id"]

    base = {
        "timestamp": "2025-10-25T19:15:33Z",
        "user_id": user_id,
        "session_id": session_id,
    }

    events = [
        {
            "event_type": "lesson_started",
            **base,
            "data": {
                "lesson_id": str(uuid.uuid4()),
                "lesson_title": "Fractions 101",
                "subject": "Math",
                "grade_level": 3,
            },
        },
        {
            "event_type": "lesson_completed",
            **base,
            "data": {
                "lesson_id": str(uuid.uuid4()),
                "time_spent_ms": 120000,
                "completion_percentage": 100,
            },
        },
        {
            "event_type": "quiz_started",
            **base,
            "data": {
                "quiz_id": str(uuid.uuid4()),
                "lesson_id": str(uuid.uuid4()),
                "question_count": 5,
            },
        },
        {
            "event_type": "question_answered",
            **base,
            "data": {
                "question_id": str(uuid.uuid4()),
                "answer": "A",
                "is_correct": True,
                "response_latency_ms": 850,
            },
        },
        {
            "event_type": "quiz_completed",
            **base,
            "data": {
                "quiz_id": str(uuid.uuid4()),
                "score": 4,
                "total_questions": 5,
                "time_spent_ms": 60000,
                "mastery_achieved": True,
            },
        },
        {
            "event_type": "hint_requested",
            **base,
            "data": {
                "question_id": str(uuid.uuid4()),
                "hint_level": 1,
                "misconception_type": "place_value",
            },
        },
        {
            "event_type": "feedback_provided",
            **base,
            "data": {
                "question_id": str(uuid.uuid4()),
                "feedback_type": "hint",
                "misconception_addressed": "place_value",
            },
        },
        {
            "event_type": "attention_drift_detected",
            **base,
            "data": {
                "attention_score": 0.3,
                "response_latency_ms": 4200,
                "error_rate": 0.5,
                "action_taken": "break_suggested",
            },
        },
        {
            "event_type": "break_suggested",
            **base,
            "data": {
                "reason": "attention_drift",
                "duration_minutes": 3,
                "accepted": True,
            },
        },
        {
            "event_type": "re_quiz_triggered",
            **base,
            "data": {
                "original_quiz_id": str(uuid.uuid4()),
                "trigger_reason": "low_mastery",
                "misconception_type": "fractions",
            },
        },
    ]

    for payload in events:
        res = client.post("/api/v1/analytics/events", json=payload)
        assert res.status_code == 202


def test_attention_peaks_endpoint_basic(client):
    user_id = _random_user_id()
    user_uuid = uuid.UUID(user_id)
    now = uuid.uuid1()  # just to have a stable-ish ordering; actual time not critical here

    with SessionLocal() as db:
        # Clean any prior metrics for this user.
        db.query(AttentionMetric).filter(AttentionMetric.user_id == user_uuid).delete()
        db.commit()

        # Insert synthetic metrics for two windows:
        rows = [
            AttentionMetric(
                user_id=user_uuid,
                session_id=None,
                lesson_id=None,
                attention_score=0.9,
                avg_response_latency_ms=800,
                error_rate=0.0,
                hour_of_day=9,
                day_of_week=0,  # Monday
            ),
            AttentionMetric(
                user_id=user_uuid,
                session_id=None,
                lesson_id=None,
                attention_score=0.8,
                avg_response_latency_ms=900,
                error_rate=0.1,
                hour_of_day=9,
                day_of_week=0,  # Monday
            ),
            AttentionMetric(
                user_id=user_uuid,
                session_id=None,
                lesson_id=None,
                attention_score=0.5,
                avg_response_latency_ms=2000,
                error_rate=0.3,
                hour_of_day=18,
                day_of_week=1,  # Tuesday
            ),
        ]
        db.add_all(rows)
        db.commit()

    # Use a very low min_samples so that our small synthetic dataset still yields peaks.
    res = client.get(f"/api/v1/analytics/attention/peaks/?user_id={user_id}&min_samples=1")
    assert res.status_code == 200
    body = res.json()
    assert body["user_id"] == user_id
    assert isinstance(body["windows"], list)
    assert len(body["windows"]) >= 2

    top = body["windows"][0]
    assert top["day_of_week"] == 0
    assert top["hour_of_day"] == 9
    assert top["samples"] == 2
    assert 0.84 < top["score"] < 0.91


def test_dashboard_endpoint_basic(client):
    user_id = _random_user_id()
    user_uuid = uuid.UUID(user_id)

    with SessionLocal() as db:
        # Clean any prior data for this user.
        db.query(AttentionMetric).filter(AttentionMetric.user_id == user_uuid).delete()
        db.query(UserEvent).filter(UserEvent.user_id == user_uuid).delete()
        db.commit()

        # Seed some attention metrics.
        metrics = [
            AttentionMetric(
                user_id=user_uuid,
                session_id=None,
                lesson_id=None,
                attention_score=0.8,
                avg_response_latency_ms=800,
                error_rate=0.1,
                hour_of_day=9,
                day_of_week=0,
            ),
            AttentionMetric(
                user_id=user_uuid,
                session_id=None,
                lesson_id=None,
                attention_score=0.6,
                avg_response_latency_ms=1200,
                error_rate=0.2,
                hour_of_day=10,
                day_of_week=1,
            ),
        ]

        # Seed some user_events for lessons/quizzes.
        events = [
            UserEvent(
                user_id=user_uuid,
                session_id=None,
                event_type="lesson_completed",
                event_data={"lesson_id": str(uuid.uuid4()), "time_spent_ms": 600000},
            ),
            UserEvent(
                user_id=user_uuid,
                session_id=None,
                event_type="lesson_completed",
                event_data={"lesson_id": str(uuid.uuid4()), "time_spent_ms": 300000},
            ),
            UserEvent(
                user_id=user_uuid,
                session_id=None,
                event_type="quiz_completed",
                event_data={"quiz_id": str(uuid.uuid4()), "score": 4, "total_questions": 5},
            ),
        ]

        db.add_all(metrics + events)
        db.commit()

    res = client.get(f"/api/v1/analytics/dashboard/{user_id}")
    assert res.status_code == 200
    body = res.json()

    assert body["user_id"] == user_id
    assert body["lessons_completed"] >= 2
    assert body["quizzes_taken"] >= 1
    assert "attention_summary" in body
    assert isinstance(body["attention_summary"], dict)


def test_attention_summary_endpoint_basic(client):
    user_id = _random_user_id()
    user_uuid = uuid.UUID(user_id)

    with SessionLocal() as db:
        # Clean any prior data for this user.
        db.query(AttentionMetric).filter(AttentionMetric.user_id == user_uuid).delete()
        db.commit()

        # Seed attention metrics across two different days with different scores.
        now = datetime.now(timezone.utc)
        rows = [
            AttentionMetric(
                user_id=user_uuid,
                session_id=None,
                lesson_id=None,
                attention_score=0.8,
                avg_response_latency_ms=800,
                error_rate=0.1,
                recorded_at=now - timedelta(days=1),
            ),
            AttentionMetric(
                user_id=user_uuid,
                session_id=None,
                lesson_id=None,
                attention_score=0.6,
                avg_response_latency_ms=900,
                error_rate=0.2,
                recorded_at=now - timedelta(days=1),
            ),
            AttentionMetric(
                user_id=user_uuid,
                session_id=None,
                lesson_id=None,
                attention_score=0.3,
                avg_response_latency_ms=1500,
                error_rate=0.4,
                recorded_at=now - timedelta(days=2),
            ),
        ]
        db.add_all(rows)
        db.commit()

    res = client.get(f"/api/v1/analytics/attention/summary/?user_id={user_id}&range_days=7")
    assert res.status_code == 200
    body = res.json()

    assert body["user_id"] == user_id
    assert body["range_days"] == 7
    assert isinstance(body["daily_avg"], list)
    # We seeded two distinct days, so expect at least 2 entries.
    assert len(body["daily_avg"]) >= 2
    # There should be at least one low-score metric contributing to drift_count.
    assert body["drift_count"] >= 1

