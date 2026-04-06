from fastapi import APIRouter

from app.api.routes.auth import router as auth_router
from app.api.routes.lessons import router as lessons_router
from app.api.v1.endpoints.analytics import router as analytics_router
from app.api.v1.endpoints.sessions import router as sessions_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(lessons_router)
api_router.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(sessions_router, prefix="/sessions", tags=["Sessions"])
