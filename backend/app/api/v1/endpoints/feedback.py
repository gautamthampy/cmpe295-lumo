"""Feedback endpoints — Bhavya's component (Phase 2)."""
from fastapi import APIRouter, Body, Depends
from fastapi.responses import JSONResponse
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.feedback_agent import feedback_agent
from app.schemas.feedback import HintRequest, ExplanationRequest, ReQuizRequest

router = APIRouter()


@router.post("/hint")
async def request_hint(
    payload: HintRequest,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Request a hint for a question.
    """
    # Call Feedback Agent
    result = await feedback_agent.generate_hint(
        db=db,
        question_id=payload.question_id,
        question_text=payload.question_text,
        user_id=payload.user_id,
        session_id=payload.session_id,
        hint_level=payload.hint_level,
        misconception_type=payload.misconception_type
    )
    return result


@router.post("/explanation")
async def get_explanation(
    payload: ExplanationRequest,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get explanation for incorrect answer.
    """
    result = await feedback_agent.generate_explanation(
        db=db,
        question_id=payload.question_id,
        question_text=payload.question_text,
        user_answer=payload.user_answer,
        correct_answer=payload.correct_answer,
        user_id=payload.user_id,
        session_id=payload.session_id,
        misconception_type=payload.misconception_type
    )
    return result


@router.post("/re-quiz")
async def trigger_re_quiz(
     payload: ReQuizRequest,
     db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Trigger re-quiz logic.
    """
    result = await feedback_agent.trigger_re_quiz(payload.quiz_id, payload.user_id)
    return result
