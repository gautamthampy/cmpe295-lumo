"""Feedback endpoints — Bhavya's component (Phase 2 stub)."""
from uuid import UUID

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.services.attention_feedback import record_attention_signal

router = APIRouter()


class AttentionSignalBody(BaseModel):
    """Minimal hook for Attention Agent → Feedback / Planner (full hints remain Phase 2)."""

    user_id: UUID
    session_id: UUID
    recommended_action: str
    rationale: str = ""


@router.post("/hint")
async def request_hint():
    """Request a hint for a quiz question. [Phase 2 - Bhavya]"""
    return JSONResponse(status_code=501, content={"detail": "Not implemented."})


@router.post("/explanation")
async def get_explanation():
    """Get a full explanation for a question. [Phase 2 - Bhavya]"""
    return JSONResponse(status_code=501, content={"detail": "Not implemented."})


@router.post("/re-quiz")
async def trigger_requiz():
    """Trigger re-quiz for a misconception. [Phase 2 - Bhavya]"""
    return JSONResponse(status_code=501, content={"detail": "Not implemented."})


@router.post("/attention-signal")
def post_attention_signal(body: AttentionSignalBody):
    """Record that attention recommends a recap/break/continue (integration point for Feedback)."""
    record_attention_signal(
        body.user_id,
        body.session_id,
        body.recommended_action,
        body.rationale,
    )
    return JSONResponse(status_code=200, content={"status": "ok"})
