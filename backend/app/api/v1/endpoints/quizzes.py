"""Quiz endpoints — Alshama's component (Phase 2 stub)."""
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()


@router.post("/generate")
async def generate_quiz():
    """Generate a quiz for a lesson. [Phase 2 - Alshama]"""
    return JSONResponse(
        status_code=501,
        content={"detail": "Real quiz generation not yet implemented. Use /mock/generate."},
    )


@router.get("/{quiz_id}")
async def get_quiz(quiz_id: str):
    """Get a quiz by ID. [Phase 2 - Alshama]"""
    return JSONResponse(status_code=501, content={"detail": "Not implemented."})


@router.post("/{quiz_id}/submit")
async def submit_quiz(quiz_id: str):
    """Submit quiz answers. [Phase 2 - Alshama]"""
    return JSONResponse(status_code=501, content={"detail": "Not implemented."})
