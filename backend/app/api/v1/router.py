"""API v1 router — combines all endpoint modules."""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    analytics,
    feedback,
    lessons,
    mock_quiz,
    quizzes,
    sessions,
)

api_router = APIRouter()

api_router.include_router(lessons.router, prefix="/lessons", tags=["Lessons"])
api_router.include_router(quizzes.router, prefix="/quizzes", tags=["Quizzes"])
api_router.include_router(feedback.router, prefix="/feedback", tags=["Feedback"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["Sessions"])
api_router.include_router(mock_quiz.router, prefix="/mock", tags=["Mock (PoC)"])
