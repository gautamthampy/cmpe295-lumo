"""Session endpoints — creates and manages learning sessions stored in events.sessions."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import cast
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session as DbSession

from app.core.database import get_db
from app.models.session import SessionModel
from app.schemas.sessions import SessionCreate, SessionResponse

router = APIRouter()


def _session_response(session: SessionModel) -> SessionResponse:
    return SessionResponse(
        session_id=cast(UUID, session.session_id),
        user_id=cast(UUID, session.user_id),
        started_at=cast(datetime, session.started_at),
        ended_at=cast(datetime | None, session.ended_at),
        device_type=cast(str | None, session.device_type),
        user_agent=cast(str | None, session.user_agent),
    )


@router.post("/", response_model=SessionResponse)
def create_session(
    payload: SessionCreate,
    request: Request,
    db: DbSession = Depends(get_db),
) -> SessionResponse:
    """Create a new learning session for a user."""
    user_agent = payload.user_agent or request.headers.get("user-agent", "")
    session = SessionModel(
        user_id=payload.user_id,
        device_type=payload.device_type,
        user_agent=user_agent,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return _session_response(session)


@router.post("/{session_id}/end", response_model=SessionResponse)
def end_session(
    session_id: UUID,
    db: DbSession = Depends(get_db),
) -> SessionResponse:
    """Mark a session as ended."""
    session = db.get(SessionModel, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")

    if session.ended_at is None:
        setattr(session, "ended_at", datetime.now(timezone.utc))
        db.add(session)
        db.commit()
        db.refresh(session)

    return _session_response(session)
