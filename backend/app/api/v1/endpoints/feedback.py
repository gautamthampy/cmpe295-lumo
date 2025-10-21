"""
Feedback endpoints (Bhavya's component)
Handles hint generation, motivational messages, and re-quiz triggers
"""
from fastapi import APIRouter

router = APIRouter()


@router.post("/hint")
async def request_hint() -> dict:
    """Request hint for a question - Placeholder for Phase 2"""
    return {"message": "Hint endpoint - Single level hint loop to be implemented in Phase 2"}


@router.post("/explanation")
async def get_explanation() -> dict:
    """Get explanation for incorrect answer - Placeholder"""
    return {"message": "Explanation endpoint - To be implemented"}


@router.post("/re-quiz")
async def trigger_re_quiz() -> dict:
    """Trigger re-quiz (behind flag) - Placeholder for Phase 2"""
    return {"message": "Re-quiz trigger - To be wired behind flag in Phase 2"}

