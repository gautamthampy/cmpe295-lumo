"""Analytics & Attention endpoints.

This wires the attention engine into the main backend, using:
- events.user_events for raw interaction telemetry (future integration)
- learner.attention_metrics for derived attention history
"""
from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.attention import AttentionMetric
from app.models.session import SessionModel
from app.schemas.analytics import AttentionSnapshot, AttentionSummary, Event
from app.services.attention_engine import (
    AttentionFeatures,
    build_rationale,
    compute_attention_score,
    evaluate_drift,
    get_drift_status,
    update_features_and_compute,
)

router = APIRouter()


@router.post("/events", status_code=202)
def ingest_event(event: Event, db: Session = Depends(get_db)):
    """Ingest a user event and update attention metrics.

    Focuses on question_answered events for now, using:
    - response_latency_ms
    - is_correct
    """
    if event.event_type != "question_answered":
        # For non-question events we simply acknowledge for now.
        return JSONResponse(status_code=202, content={"detail": "Event accepted (ignored for attention)."})

    latency_ms = event.data.get("response_latency_ms")
    is_correct = event.data.get("is_correct")
    idle_ms = event.data.get("idle_ms")
    lesson_id = event.data.get("lesson_id")

    features: AttentionFeatures = update_features_and_compute(
        user_id=str(event.user_id),
        session_id=str(event.session_id),
        latency_ms=int(latency_ms) if latency_ms is not None else None,
        is_correct=bool(is_correct) if is_correct is not None else None,
        idle_ms=int(idle_ms) if idle_ms is not None else None,
    )
    score, _details = compute_attention_score(features)
    _rationale = build_rationale(features, score)
    drift, recommended_action = evaluate_drift(
        user_id=str(event.user_id),
        session_id=str(event.session_id),
        score=score,
    )

    # Ensure the referenced session exists so we respect the DB foreign key.
    session = db.get(SessionModel, event.session_id)
    if session is None:
        return JSONResponse(
            status_code=400,
            content={"detail": "Unknown session_id. Create a session before logging events."},
        )

    metric = AttentionMetric(
        user_id=event.user_id,
        session_id=event.session_id,
        lesson_id=None,
        attention_score=score,
        avg_response_latency_ms=int(latency_ms) if latency_ms is not None else None,
        error_rate=features.err_norm,
    )
    db.add(metric)
    db.commit()

    return JSONResponse(
        status_code=202,
        content={
            "attention_score": score,
            "drift": drift,
            "recommended_action": recommended_action,
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

    # Use most recent metric (if any) to derive drift view.
    if rows:
        last_session_id = rows[0].session_id
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


@router.get("/dashboard")
def get_dashboard():
    """Placeholder dashboard endpoint (to be expanded with real aggregates)."""
    return JSONResponse(
        status_code=200,
        content={"detail": "Analytics dashboard implementation pending.", "status": "ok"},
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

