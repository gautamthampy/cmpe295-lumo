"""Session endpoints.

Creates and manages learning sessions stored in events.sessions.
"""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session as DbSession

from app.core.database import get_db
from app.models.session import SessionModel
from app.schemas.sessions import SessionCreate, SessionResponse

router = APIRouter()


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
    return SessionResponse(
        session_id=session.session_id,
        user_id=session.user_id,
        started_at=session.started_at,
        ended_at=session.ended_at,
        device_type=session.device_type,
        user_agent=session.user_agent,
    )


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
        session.ended_at = datetime.now(timezone.utc)
        db.add(session)
        db.commit()
        db.refresh(session)

    return SessionResponse(
        session_id=session.session_id,
        user_id=session.user_id,
        started_at=session.started_at,
        ended_at=session.ended_at,
        device_type=session.device_type,
        user_agent=session.user_agent,
    )

