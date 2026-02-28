"""SQLAlchemy ORM model for the content.lessons table."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Text, DateTime, ARRAY
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class Lesson(Base):
    __tablename__ = "lessons"
    __table_args__ = {"schema": "content"}

    lesson_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    subject = Column(String(100), nullable=False)
    grade_level = Column(Integer, nullable=False)
    content_mdx = Column(Text, nullable=False)
    misconception_tags = Column(ARRAY(Text), nullable=False, default=list)
    status = Column(String(20), nullable=False, default="draft")
    version = Column(Integer, nullable=False, default=1)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
