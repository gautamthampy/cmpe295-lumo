"""Analytics & Attention endpoints.

This wires the attention engine into the main backend, using:
- events.user_events for raw interaction telemetry
- learner.attention_metrics for derived attention history
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.constants.analytics_events import (
    GAZE_EVENT_TYPES,
    MINI_TEST_EVENT_TYPES,
    PERSIST_ONLY_EVENT_TYPES,
    SELF_REPORT_EVENT_TYPES,
)
from app.core.config import settings
from app.core.database import get_db
from app.models.attention import AttentionMetric
from app.models.events import UserEvent
from app.models.session import SessionModel
from app.schemas.analytics import (
    AttentionMiniTestCompletedData,
    AttentionMiniTestStartedData,
    AttentionSelfReportData,
    AttentionSnapshot,
    AttentionSummary,
    Event,
    GazeAttentionLikelihoodData,
)
from app.services.attention_feedback import record_attention_signal
from app.services.attention_engine import (
    AttentionFeatures,
    build_rationale,
    compute_attention_score,
    evaluate_drift,
    get_drift_status,
    rationale_from_score,
    update_features_and_compute,
)
from app.services.attention_peaks import get_attention_peaks_for_user
from app.services.mini_test_scoring import mini_test_score_to_action

router = APIRouter()


def _persist_event(event: Event, db: Session) -> None:
    """Persist a generic event to events.user_events."""
    event_ts_utc = event.timestamp.astimezone(timezone.utc)
    user_event = UserEvent(
        user_id=event.user_id,
        session_id=event.session_id,
        event_type=event.event_type,
        event_data={
            "timestamp": event_ts_utc.isoformat(),
            "data": event.data,
        },
    )
    db.add(user_event)


@router.post("/events", status_code=202)
def ingest_event(event: Event, db: Session = Depends(get_db)):
    """Ingest a user event and update attention metrics.

    - question_answered: updates attention pipeline and persists to user_events.
    - attention_mini_test_started / attention_mini_test_completed: validated and persisted to user_events.
    - Other schema event types: persisted to user_events only (no attention scoring).
    - Unknown event types: 202 acknowledged, not persisted.
    """
    # Mini-test events: validate session, validate payload, persist to user_events.
    if event.event_type in MINI_TEST_EVENT_TYPES:
        session_row = db.get(SessionModel, event.session_id)
        if session_row is None:
            return JSONResponse(
                status_code=400,
                content={"detail": "Unknown session_id. Create a session before logging events."},
            )
        if event.event_type == "attention_mini_test_started":
            try:
                AttentionMiniTestStartedData.model_validate(event.data)
            except Exception:
                pass  # data is optional; allow empty or extra fields
        else:
            try:
                completed = AttentionMiniTestCompletedData.model_validate(event.data)
            except Exception as e:
                return JSONResponse(
                    status_code=422,
                    content={"detail": "Invalid mini-test completed data", "error": str(e)},
                )
        _persist_event(event, db)
        if event.event_type == "attention_mini_test_completed":
            attn_score, recommended = mini_test_score_to_action(completed.score)
            event_ts_utc = event.timestamp.astimezone(timezone.utc)
            metric = AttentionMetric(
                user_id=event.user_id,
                session_id=event.session_id,
                lesson_id=None,
                attention_score=attn_score,
                avg_response_latency_ms=completed.time_taken_ms,
                error_rate=None,
                hour_of_day=event_ts_utc.hour,
                day_of_week=event_ts_utc.weekday(),
            )
            db.add(metric)
        db.commit()
        if event.event_type == "attention_mini_test_completed":
            attn_score, recommended = mini_test_score_to_action(completed.score)
            return JSONResponse(
                status_code=202,
                content={
                    "detail": "Mini-test event accepted and stored.",
                    "attention_score": attn_score,
                    "recommended_action": recommended,
                },
            )
        return JSONResponse(
            status_code=202,
            content={"detail": "Mini-test event accepted and stored."},
        )

    if event.event_type in GAZE_EVENT_TYPES:
        if not settings.ENABLE_GAZE_TELEMETRY:
            return JSONResponse(status_code=202, content={"detail": "Gaze telemetry disabled."})
        session_row = db.get(SessionModel, event.session_id)
        if session_row is None:
            return JSONResponse(
                status_code=400,
                content={"detail": "Unknown session_id. Create a session before logging events."},
            )
        try:
            GazeAttentionLikelihoodData.model_validate(event.data)
        except Exception as e:
            return JSONResponse(
                status_code=422,
                content={"detail": "Invalid gaze_attention_likelihood payload", "error": str(e)},
            )
        _persist_event(event, db)
        db.commit()
        return JSONResponse(status_code=202, content={"detail": "Gaze telemetry stored."})

    if event.event_type in SELF_REPORT_EVENT_TYPES:
        session_row = db.get(SessionModel, event.session_id)
        if session_row is None:
            return JSONResponse(
                status_code=400,
                content={"detail": "Unknown session_id. Create a session before logging events."},
            )
        try:
            AttentionSelfReportData.model_validate(event.data)
        except Exception as e:
            return JSONResponse(
                status_code=422,
                content={"detail": "Invalid attention_self_report data", "error": str(e)},
            )
        _persist_event(event, db)
        db.commit()
        return JSONResponse(status_code=202, content={"detail": "Self-report stored."})

    if event.event_type != "question_answered":
        if event.event_type in PERSIST_ONLY_EVENT_TYPES:
            session_row = db.get(SessionModel, event.session_id)
            if session_row is None:
                return JSONResponse(
                    status_code=400,
                    content={"detail": "Unknown session_id. Create a session before logging events."},
                )
            _persist_event(event, db)
            db.commit()
            return JSONResponse(
                status_code=202,
                content={"detail": "Event accepted and stored."},
            )
        return JSONResponse(status_code=202, content={"detail": "Event accepted (ignored for attention)."})

    # Validate session exists before updating Redis; invalid sessions must not pollute drift state.
    session_row = db.get(SessionModel, event.session_id)
    if session_row is None:
        return JSONResponse(
            status_code=400,
            content={"detail": "Unknown session_id. Create a session before logging events."},
        )

    latency_ms = event.data.get("response_latency_ms")
    is_correct = event.data.get("is_correct")
    idle_ms = event.data.get("idle_ms")
    raw_lesson_id = event.data.get("lesson_id")

    lesson_id: UUID | None = None
    if raw_lesson_id is not None:
        try:
            lesson_id = UUID(str(raw_lesson_id))
        except (ValueError, TypeError):
            lesson_id = None

    _persist_event(event, db)
    event_ts_utc = event.timestamp.astimezone(timezone.utc)

    features: AttentionFeatures = update_features_and_compute(
        user_id=str(event.user_id),
        session_id=str(event.session_id),
        latency_ms=int(latency_ms) if latency_ms is not None else None,
        is_correct=bool(is_correct) if is_correct is not None else None,
        idle_ms=int(idle_ms) if idle_ms is not None else None,
    )
    score, _details = compute_attention_score(features)
    rationale = build_rationale(features, score)
    drift, recommended_action, drift_entered = evaluate_drift(
        user_id=str(event.user_id),
        session_id=str(event.session_id),
        score=score,
    )

    if drift_entered:
        action_taken = "break_suggested" if recommended_action == "break" else "recap_triggered"
        drift_event = Event(
            event_type="attention_drift_detected",
            timestamp=event.timestamp,
            user_id=event.user_id,
            session_id=event.session_id,
            data={
                "attention_score": score,
                "response_latency_ms": int(latency_ms) if latency_ms is not None else None,
                "error_rate": float(features.err_norm),
                "action_taken": action_taken,
            },
        )
        _persist_event(drift_event, db)
        record_attention_signal(
            event.user_id,
            event.session_id,
            recommended_action,
            rationale,
        )

    # Use the event's timestamp (in UTC) for time buckets so analytics can
    # reason about peak hours and weekdays.
    hour_of_day = event_ts_utc.hour
    day_of_week = event_ts_utc.weekday()

    metric = AttentionMetric(
        user_id=event.user_id,
        session_id=event.session_id,
        lesson_id=lesson_id,
        attention_score=score,
        avg_response_latency_ms=int(latency_ms) if latency_ms is not None else None,
        error_rate=features.err_norm,
        hour_of_day=hour_of_day,
        day_of_week=day_of_week,
    )
    db.add(metric)
    db.commit()

    return JSONResponse(
        status_code=202,
        content={
            "attention_score": score,
            "drift": drift,
            "recommended_action": recommended_action,
            "rationale": rationale,
        },
    )


@router.get("/attention/current/")
def get_current_attention(user_id: UUID, session_id: UUID, db: Session = Depends(get_db)):
    """Get the most recent attention status for a specific user + session."""
    row: AttentionMetric | None = (
        db.query(AttentionMetric)
        .filter(
            AttentionMetric.user_id == user_id,
            AttentionMetric.session_id == session_id,
        )
        .order_by(desc(AttentionMetric.recorded_at))
        .first()
    )

    if row is None or row.attention_score is None:
        # No data yet: default to stable attention.
        score = 1.0
        drift, recommended_action = False, "continue"
        rationale = rationale_from_score(score)
    else:
        score = float(row.attention_score)
        drift, recommended_action = get_drift_status(
            user_id=str(user_id),
            session_id=str(session_id),
        )
        rationale = rationale_from_score(score)

    return JSONResponse(
        status_code=200,
        content={
            "user_id": str(user_id),
            "session_id": str(session_id),
            "attention_score": score,
            "drift": drift,
            "recommended_action": recommended_action,
            "rationale": rationale,
        },
    )


@router.get("/attention/{user_id}", response_model=AttentionSummary)
def get_attention_metrics(user_id: UUID, db: Session = Depends(get_db)):
    """Get recent attention metrics and current drift status for a user."""
    rows: List[AttentionMetric] = (
        db.query(AttentionMetric)
        .filter(AttentionMetric.user_id == user_id)
        .order_by(desc(AttentionMetric.recorded_at))
        .limit(50)
        .all()
    )

    snapshots = [
        AttentionSnapshot(
            recorded_at=row.recorded_at,
            session_id=row.session_id,
            lesson_id=row.lesson_id,
            attention_score=row.attention_score,
            avg_response_latency_ms=row.avg_response_latency_ms,
            error_rate=row.error_rate,
        )
        for row in rows
    ]

    # Use most recent metric (if any) to derive drift view and rationale.
    if rows:
        last_session_id = rows[0].session_id
        last_score = float(rows[0].attention_score) if rows[0].attention_score is not None else 0.0
        drift, recommended_action = get_drift_status(
            user_id=str(user_id),
            session_id=str(last_session_id) if last_session_id is not None else "unknown",
        )
    else:
        drift, recommended_action = False, "continue"

    return AttentionSummary(
        user_id=user_id,
        recent=snapshots,
        drift=drift,
        recommended_action=recommended_action,
    )


@router.get("/attention/peaks/")
def get_attention_peaks(
    user_id: UUID,
    window_days: int = 28,
    min_samples: int = 5,
    top_k: int = 5,
    db: Session = Depends(get_db),
):
    """Get top attention peak windows (hour x weekday) for a user."""
    peaks = get_attention_peaks_for_user(
        db=db,
        user_id=user_id,
        window_days=window_days,
        min_samples=min_samples,
        top_k=top_k,
    )

    windows = [
        {
            "day_of_week": p.day_of_week,
            "hour_of_day": p.hour_of_day,
            "score": p.avg_score,
            "samples": p.samples,
        }
        for p in peaks
    ]

    return JSONResponse(
        status_code=200,
        content={
            "user_id": str(user_id),
            "windows": windows,
        },
    )


@router.get("/attention/summary/")
def get_attention_summary(
    user_id: UUID,
    range_days: int = 7,
    db: Session = Depends(get_db),
):
    """Get daily average attention scores over a recent window for a user."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=range_days)

    day_col = func.date_trunc("day", AttentionMetric.recorded_at)

    rows = (
        db.query(
            day_col.label("day"),
            func.avg(AttentionMetric.attention_score).label("avg_score"),
        )
        .filter(
            AttentionMetric.user_id == user_id,
            AttentionMetric.recorded_at >= cutoff,
            AttentionMetric.attention_score.isnot(None),
        )
        .group_by(day_col)
        .order_by(day_col.asc())
        .all()
    )

    daily_avg = [
        {
            "date": row.day.date().isoformat(),
            "score": float(row.avg_score) if row.avg_score is not None else 0.0,
        }
        for row in rows
    ]

    # Simple drift_count heuristic: number of metrics in window with score < 0.4
    drift_count = (
        db.query(func.count(AttentionMetric.id))
        .filter(
            AttentionMetric.user_id == user_id,
            AttentionMetric.recorded_at >= cutoff,
            AttentionMetric.attention_score.isnot(None),
            AttentionMetric.attention_score < 0.4,
        )
        .scalar()
        or 0
    )

    return JSONResponse(
        status_code=200,
        content={
            "user_id": str(user_id),
            "range_days": range_days,
            "daily_avg": daily_avg,
            "drift_count": int(drift_count),
        },
    )


@router.get("/dashboard")
def get_dashboard():
    """Deprecated: use GET /analytics/dashboard/{user_id} for dashboard data."""
    return JSONResponse(
        status_code=200,
        content={
            "detail": "Deprecated. Use GET /api/v1/analytics/dashboard/{user_id} with a user UUID.",
            "deprecated": True,
        },
    )


@router.get("/mastery/{user_id}")
def get_mastery_scores(user_id: UUID):
    """Placeholder for mastery vs attention correlation."""
    return JSONResponse(
        status_code=200,
        content={
            "user_id": str(user_id),
            "detail": "Mastery analytics implementation pending.",
        },
    )


@router.get("/dashboard/{user_id}")
def get_dashboard_data(user_id: UUID, db: Session = Depends(get_db)):
    """Get a minimal dashboard view for a user.

    This aligns loosely with DashboardData in api_contracts.yaml, focusing on:
    - lessons_completed, quizzes_taken from events.user_events
    - a simple overall_mastery placeholder
    - a basic attention_summary derived from attention_metrics
    """
    # Lessons completed & quizzes taken from events.user_events.
    lessons_completed = (
        db.query(func.count(UserEvent.event_id))
        .filter(
            UserEvent.user_id == user_id,
            UserEvent.event_type == "lesson_completed",
        )
        .scalar()
        or 0
    )
    quizzes_taken = (
        db.query(func.count(UserEvent.event_id))
        .filter(
            UserEvent.user_id == user_id,
            UserEvent.event_type == "quiz_completed",
        )
        .scalar()
        or 0
    )

    # Simple attention summary: average score across all metrics for the user.
    avg_score = (
        db.query(func.avg(AttentionMetric.attention_score))
        .filter(AttentionMetric.user_id == user_id, AttentionMetric.attention_score.isnot(None))
        .scalar()
    )
    avg_score_val = float(avg_score) if avg_score is not None else 0.0

    attention_summary = {
        "average_attention_score": avg_score_val,
        "peak_focus_time": "",
        "drift_count": 0,
    }

    # For now, overall_mastery/strengths/weaknesses/time_spent are simple placeholders.
    dashboard = {
        "user_id": str(user_id),
        "lessons_completed": int(lessons_completed),
        "quizzes_taken": int(quizzes_taken),
        "overall_mastery": 0.0,
        "strengths": [],
        "weaknesses": [],
        "time_spent_minutes": 0,
        "attention_summary": attention_summary,
    }

    return JSONResponse(status_code=200, content=dashboard)

