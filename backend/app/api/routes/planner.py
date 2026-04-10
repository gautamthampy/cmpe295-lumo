"""Planner endpoints — learning path recommendation."""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.planner_service import PlannerService

router = APIRouter()


@router.get("/recommend/{student_id}")
def get_recommendations(
    student_id: UUID,
    session_id: UUID | None = Query(default=None),
    limit: int = Query(default=3, ge=1, le=10),
    db: Session = Depends(get_db),
):
    """
    Get ranked learning recommendations for a student.

    Returns a list of next-best-actions based on attention state,
    recent feedback usage, and progress signals.
    """
    planner = PlannerService(db)
    recommendations = planner.recommend(
        student_id=student_id,
        session_id=session_id,
        limit=limit,
    )
    return {
        "student_id": str(student_id),
        "recommendations": recommendations,
    }
