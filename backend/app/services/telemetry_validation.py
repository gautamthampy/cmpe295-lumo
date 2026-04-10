"""Temporal coherence checks for analytics telemetry."""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.events import UserEvent


def _parse_row_event_time(row: UserEvent) -> datetime | None:
    ed = row.event_data or {}
    raw = ed.get("timestamp")
    if isinstance(raw, str):
        try:
            return datetime.fromisoformat(raw.replace("Z", "+00:00")).astimezone(timezone.utc)
        except ValueError:
            pass
    ca = row.created_at
    if ca is not None:
        return ca.astimezone(timezone.utc) if ca.tzinfo else ca.replace(tzinfo=timezone.utc)
    return None


def lesson_started_precedes_question(
    db: Session,
    session_id: UUID,
    question_timestamp: datetime,
) -> bool:
    """True if there is a lesson_started in this session with timestamp strictly before the question."""
    rows = (
        db.query(UserEvent)
        .filter(
            UserEvent.session_id == session_id,
            UserEvent.event_type == "lesson_started",
        )
        .all()
    )
    if not rows:
        return False
    q_ts = question_timestamp.astimezone(timezone.utc)
    for row in rows:
        ls_ts = _parse_row_event_time(row)
        # Allow same instant (e.g. batched test payloads) as long as lesson_started exists first.
        if ls_ts is not None and ls_ts <= q_ts:
            return True
    return False


def _exists_prior_event(
    db: Session,
    session_id: UUID,
    required_type: str,
    current_timestamp: datetime,
) -> bool:
    rows = (
        db.query(UserEvent)
        .filter(
            UserEvent.session_id == session_id,
            UserEvent.event_type == required_type,
        )
        .all()
    )
    if not rows:
        return False
    cur = current_timestamp.astimezone(timezone.utc)
    for row in rows:
        ts = _parse_row_event_time(row)
        if ts is not None and ts <= cur:
            return True
    return False


def quiz_started_follows_lesson_started(db: Session, session_id: UUID, ts: datetime) -> bool:
    return _exists_prior_event(db, session_id, "lesson_started", ts)


def quiz_completed_follows_quiz_started(db: Session, session_id: UUID, ts: datetime) -> bool:
    return _exists_prior_event(db, session_id, "quiz_started", ts)


def lesson_completed_follows_lesson_started(db: Session, session_id: UUID, ts: datetime) -> bool:
    return _exists_prior_event(db, session_id, "lesson_started", ts)
