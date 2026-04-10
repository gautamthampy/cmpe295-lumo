"""
Evaluation endpoint — surfaces strategy comparison data from content.generation_runs.
Used for the capstone paper comparative evaluation and parent-facing transparency panel.
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.subject import GenerationRun, Subject

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/strategy-comparison")
async def strategy_comparison(
    subject: Optional[str] = Query(None, description="Filter by subject slug or name"),
    grade: Optional[int] = Query(None, ge=1, le=12),
    db: Session = Depends(get_db),
):
    """
    Return per-strategy averages from logged generation runs.

    Response shape:
    {
      "strategies": ["zpd", "misconception", "bkt", "hybrid"],
      "metrics": {
        "avg_accessibility_score": {"zpd": 0.87, ...},
        "avg_latency_ms": {"zpd": 1420, ...},
        "sample_count": {"zpd": 12, ...}
      },
      "total_runs": 48
    }
    """
    q = db.query(
        GenerationRun.strategy,
        func.avg(GenerationRun.accessibility_score).label("avg_a11y"),
        func.avg(GenerationRun.latency_ms).label("avg_latency"),
        func.count(GenerationRun.run_id).label("count"),
    )

    if subject:
        subject_obj = (
            db.query(Subject)
            .filter((Subject.slug == subject) | (Subject.name == subject))
            .first()
        )
        if subject_obj:
            q = q.filter(GenerationRun.subject_id == subject_obj.subject_id)

    if grade:
        q = q.filter(GenerationRun.grade_level == grade)

    rows = q.group_by(GenerationRun.strategy).all()

    strategies = [r.strategy for r in rows]
    avg_a11y = {r.strategy: round(float(r.avg_a11y or 0), 3) for r in rows}
    avg_latency = {r.strategy: int(r.avg_latency or 0) for r in rows}
    sample_count = {r.strategy: r.count for r in rows}

    return {
        "strategies": strategies,
        "metrics": {
            "avg_accessibility_score": avg_a11y,
            "avg_latency_ms": avg_latency,
            "sample_count": sample_count,
        },
        "total_runs": sum(r.count for r in rows),
        "filters": {"subject": subject, "grade": grade},
    }


@router.get("/runs")
async def list_runs(
    strategy: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    """List recent generation runs with their eval scores."""
    q = db.query(GenerationRun).order_by(GenerationRun.created_at.desc())
    if strategy:
        q = q.filter(GenerationRun.strategy == strategy)
    runs = q.limit(limit).all()

    return [
        {
            "run_id": str(r.run_id),
            "strategy": r.strategy,
            "topic": r.topic,
            "grade_level": r.grade_level,
            "latency_ms": r.latency_ms,
            "accessibility_score": r.accessibility_score,
            "eval_scores": r.eval_scores,
            "created_at": r.created_at.isoformat(),
        }
        for r in runs
    ]
