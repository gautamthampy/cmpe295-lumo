"""
Feedback & Motivation Agent API routes.

Exposes hint generation, error explanations, motivational nudges,
and re-quiz triggers to the frontend.
"""
from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db

from app.schemas.feedback import (
    AttentionSignalRequest,
    AttentionSignalResponse,
    ExplanationRequest,
    ExplanationResponse,
    HintRequest,
    HintResponse,
    MotivationRequest,
    MotivationResponse,
    ReQuizRequest,
    ReQuizResponse,
)
from app.services.attention_feedback import record_attention_signal
from app.services.feedback_agent import feedback_agent

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Feedback"])


class AttentionSignalRequest(BaseModel):
    user_id: str
    session_id: str
    recommended_action: str
    rationale: str


@router.post("/hint", response_model=HintResponse)
async def generate_hint(
    payload: HintRequest,
    db: Session = Depends(get_db),
) -> HintResponse:
    """Generate a tiered Socratic hint (levels 1-3) for a given question."""
    result = await feedback_agent.generate_hint(
        db=db,
        question_id=payload.question_id,
        question_text=payload.question_text,
        user_id=payload.user_id,
        session_id=payload.session_id,
        hint_level=payload.hint_level,
        misconception_type=payload.misconception_type,
    )
    return HintResponse(**result)


@router.post("/explanation", response_model=ExplanationResponse)
async def generate_explanation(
    payload: ExplanationRequest,
    db: Session = Depends(get_db),
) -> ExplanationResponse:
    """Explain why an answer is incorrect and provide encouragement."""
    result = await feedback_agent.generate_explanation(
        db=db,
        question_id=payload.question_id,
        question_text=payload.question_text,
        user_answer=payload.user_answer,
        correct_answer=payload.correct_answer,
        user_id=payload.user_id,
        session_id=payload.session_id,
        misconception_type=payload.misconception_type,
    )
    return ExplanationResponse(**result)


@router.post("/motivation", response_model=MotivationResponse)
async def generate_motivation(
    payload: MotivationRequest,
    db: Session = Depends(get_db),
) -> MotivationResponse:
    """Generate a standalone motivational nudge after repeated errors."""
    result = await feedback_agent.generate_motivation(
        db=db,
        user_id=payload.user_id,
        session_id=payload.session_id,
        error_count=payload.error_count,
        question_context=payload.question_context,
    )
    return MotivationResponse(**result)


@router.post("/attention-signal", response_model=AttentionSignalResponse)
def post_attention_signal(payload: AttentionSignalRequest) -> AttentionSignalResponse:
    """Record an attention recommendation (recap/break/continue) for Planner/Feedback integration."""
    record_attention_signal(
        user_id=UUID(payload.user_id),
        session_id=UUID(payload.session_id),
        recommended_action=payload.recommended_action,
        rationale=payload.rationale,
    )
    return AttentionSignalResponse()


@router.post("/re-quiz", response_model=ReQuizResponse)
async def trigger_re_quiz(
    payload: ReQuizRequest,
) -> ReQuizResponse:
    """Determine whether a re-quiz should be triggered after support."""
    result = await feedback_agent.trigger_re_quiz(
        quiz_id=payload.quiz_id,
        user_id=payload.user_id,
    )
    return ReQuizResponse(**result)


@router.post("/attention-signal")
def record_attention_signal_endpoint(payload: AttentionSignalRequest):
    record_attention_signal(
        user_id=payload.user_id,
        session_id=payload.session_id,
        recommended_action=payload.recommended_action,
        rationale=payload.rationale,
    )
    return {"status": "ok"}
