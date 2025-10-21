"""
API v1 Router - Combines all endpoint routers
"""
from fastapi import APIRouter

from app.api.v1.endpoints import lessons, quizzes, feedback, analytics, sessions

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(lessons.router, prefix="/lessons", tags=["Lessons"])
api_router.include_router(quizzes.router, prefix="/quizzes", tags=["Quizzes"])
api_router.include_router(feedback.router, prefix="/feedback", tags=["Feedback"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["Sessions"])

