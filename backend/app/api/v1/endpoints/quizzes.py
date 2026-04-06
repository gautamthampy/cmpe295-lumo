"""Quiz Agent endpoints — Quiz generation, retrieval, and scoring."""
import logging

from fastapi import APIRouter, HTTPException

from app.schemas.quiz import (
    QuizGenerateRequest,
    QuizSubmitRequest,
    QuizSubmitResponse,
)
from app.schemas.lesson import QuizResponse
from app.services.quiz_service import get_quiz_agent

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/generate", response_model=QuizResponse)
async def generate_quiz(request: QuizGenerateRequest):
    """
    Generate an adaptive quiz for a lesson.

    Uses Gemini AI to create misconception-targeted questions when an API key
    is configured; falls back to deterministic templates automatically.
    """
    agent = get_quiz_agent()
    try:
        quiz = await agent.generate(request)
    except Exception as exc:
        logger.exception("Quiz generation failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {exc}")

    logger.info(
        "Generated quiz %s for lesson %s (%d questions, difficulty=%s)",
        quiz.quiz_id,
        request.lesson_id,
        len(quiz.questions),
        request.difficulty,
    )
    return quiz


@router.get("/{quiz_id}", response_model=QuizResponse)
async def get_quiz(quiz_id: str):
    """Retrieve a previously generated quiz by ID."""
    agent = get_quiz_agent()
    quiz = agent.get_quiz(quiz_id)
    if quiz is None:
        raise HTTPException(status_code=404, detail=f"Quiz '{quiz_id}' not found.")
    return quiz


@router.post("/{quiz_id}/submit", response_model=QuizSubmitResponse)
async def submit_quiz(quiz_id: str, request: QuizSubmitRequest):
    """
    Score a completed quiz.

    Returns per-question results, triggered misconceptions, overall score,
    pass/fail, and a human-readable rationale explaining the outcome.
    """
    if request.quiz_id != quiz_id:
        raise HTTPException(
            status_code=422,
            detail="quiz_id in path and request body must match.",
        )

    agent = get_quiz_agent()
    try:
        result = agent.submit(request)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        logger.exception("Quiz submission failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Submission failed: {exc}")

    logger.info(
        "Quiz %s scored: %d/%d (%.0f%%) — passed=%s",
        quiz_id,
        result.correct_count,
        result.total_questions,
        result.score * 100,
        result.passed,
    )
    return result
