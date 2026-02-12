from fastapi import APIRouter, Body
from typing import Dict, Any
from app.services.feedback_agent import feedback_agent

router = APIRouter()


@router.post("/hint")
async def request_hint(
    payload: Dict[str, Any] = Body(...)
) -> Dict[str, Any]:
    """
    Request a hint for a question.
    Payload should include: question_id, user_id, session_id, hint_level
    """
    question_id = payload.get("question_id")
    user_id = payload.get("user_id")
    session_id = payload.get("session_id")
    hint_level = payload.get("hint_level", 1)
    misconception_type = payload.get("misconception_type")
    
    # Call Feedback Agent
    result = await feedback_agent.generate_hint(
        question_id=question_id,
        user_id=user_id,
        session_id=session_id,
        hint_level=hint_level,
        misconception_type=misconception_type
    )
    return result


@router.post("/explanation")
async def get_explanation(
    payload: Dict[str, Any] = Body(...)
) -> Dict[str, Any]:
    """
    Get explanation for incorrect answer.
    Payload: question_id, user_answer, correct_answer
    """
    question_id = payload.get("question_id")
    user_answer = payload.get("user_answer")
    correct_answer = payload.get("correct_answer")
    misconception_type = payload.get("misconception_type")

    result = await feedback_agent.generate_explanation(
        question_id=question_id,
        user_answer=user_answer,
        correct_answer=correct_answer,
        misconception_type=misconception_type
    )
    return result


@router.post("/re-quiz")
async def trigger_re_quiz(
     payload: Dict[str, Any] = Body(...)
) -> Dict[str, Any]:
    """
    Trigger re-quiz logic.
    Payload: quiz_id, user_id
    """
    quiz_id = payload.get("quiz_id")
    user_id = payload.get("user_id")

    result = await feedback_agent.trigger_re_quiz(quiz_id, user_id)
    return result

