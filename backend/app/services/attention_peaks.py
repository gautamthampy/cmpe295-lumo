"""Helpers for computing attention peak windows from attention_metrics."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import List
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.attention import AttentionMetric


@dataclass
class AttentionPeakWindow:
    """Represents a peak attention window for a user."""

    day_of_week: int  # 0=Monday .. 6=Sunday
    hour_of_day: int  # 0-23
    avg_score: float
    samples: int


def get_attention_peaks_for_user(
    db: Session,
    user_id: UUID,
    window_days: int = 28,
    min_samples: int = 5,
    top_k: int = 5,
) -> List[AttentionPeakWindow]:
    """Compute peak attention windows for a user over a recent time window.

    This mirrors the design spec's attention_peaks_daily(user_id, day_of_week, hour_of_day, avg_score, samples)
    concept, but implemented as a helper query instead of a DB view.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=window_days)

    query = (
        db.query(
            AttentionMetric.day_of_week.label("day_of_week"),
            AttentionMetric.hour_of_day.label("hour_of_day"),
            func.avg(AttentionMetric.attention_score).label("avg_score"),
            func.count(AttentionMetric.id).label("samples"),
        )
        .filter(
            AttentionMetric.user_id == user_id,
            AttentionMetric.recorded_at >= cutoff,
            AttentionMetric.attention_score.isnot(None),
            AttentionMetric.day_of_week.isnot(None),
            AttentionMetric.hour_of_day.isnot(None),
        )
        .group_by(AttentionMetric.day_of_week, AttentionMetric.hour_of_day)
        .having(func.count(AttentionMetric.id) >= min_samples)
        .order_by(func.avg(AttentionMetric.attention_score).desc())
        .limit(top_k)
    )

    rows = query.all()
    return [
        AttentionPeakWindow(
            day_of_week=int(row.day_of_week),
            hour_of_day=int(row.hour_of_day),
            avg_score=float(row.avg_score) if row.avg_score is not None else 0.0,
            samples=int(row.samples),
        )
        for row in rows
    ]

