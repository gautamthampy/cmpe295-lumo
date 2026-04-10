"""ORM model for learner.mastery_scores (quiz-derived mastery per curriculum lesson)."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class LearnerMasteryScore(Base):
    __tablename__ = "mastery_scores"
    __table_args__ = (
        UniqueConstraint("user_id", "lesson_id", name="uq_mastery_user_lesson"),
        {"schema": "learner"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    lesson_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    score = Column(Float, nullable=False, default=0.0)
    attempts = Column(Integer, nullable=False, default=0)
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
