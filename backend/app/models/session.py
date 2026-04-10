"""SQLAlchemy ORM model for the events.sessions table."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class SessionModel(Base):
  __tablename__ = "sessions"
  __table_args__ = {"schema": "events"}

  session_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
  user_id = Column(UUID(as_uuid=True), nullable=False)
  started_at = Column(
      DateTime(timezone=True),
      nullable=False,
      default=lambda: datetime.now(timezone.utc),
  )
  ended_at = Column(DateTime(timezone=True), nullable=True)
  device_type = Column(String(50), nullable=True)
  user_agent = Column(Text, nullable=True)

