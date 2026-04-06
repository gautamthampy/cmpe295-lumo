"""SQLAlchemy ORM model for the learner.attention_metrics table."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, Integer, SmallInteger
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class AttentionMetric(Base):
    __tablename__ = "attention_metrics"
    __table_args__ = {"schema": "learner"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    session_id = Column(UUID(as_uuid=True), nullable=True)
    lesson_id = Column(UUID(as_uuid=True), nullable=True)
    attention_score = Column(Float, nullable=True)
    avg_response_latency_ms = Column(Integer, nullable=True)
    error_rate = Column(Float, nullable=True)
    hour_of_day = Column(SmallInteger, nullable=True)  # 0-23
    day_of_week = Column(SmallInteger, nullable=True)  # 0=Monday .. 6=Sunday
    recorded_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
