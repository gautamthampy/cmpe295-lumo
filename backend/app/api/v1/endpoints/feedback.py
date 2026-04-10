"""Feedback endpoints — Bhavya's component (Phase 2 stub)."""
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()


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
