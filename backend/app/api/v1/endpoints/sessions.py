"""Session endpoints (Phase 2 stub)."""
from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter()


@router.post("/")
async def create_session():
    """Create a new learning session."""
    return JSONResponse(status_code=501, content={"detail": "Not implemented."})


@router.post("/{session_id}/end")
async def end_session(session_id: str):
    """End a learning session."""
    return JSONResponse(status_code=501, content={"detail": "Not implemented."})
