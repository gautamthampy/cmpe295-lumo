"""SQLAlchemy ORM models for auth.parents and auth.students."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Parent(Base):
    __tablename__ = "parents"
    __table_args__ = {"schema": "auth"}

    parent_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    display_name = Column(String(100), nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    last_login = Column(DateTime(timezone=True), nullable=True)

    students = relationship("Student", back_populates="parent", cascade="all, delete-orphan")


class Student(Base):
    __tablename__ = "students"
    __table_args__ = {"schema": "auth"}

    student_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_id = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.parents.parent_id", ondelete="CASCADE"),
        nullable=False,
    )
    display_name = Column(String(100), nullable=False)
    grade_level = Column(Integer, nullable=False)
    pin_hash = Column(Text, nullable=True)
    avatar_id = Column(String(50), nullable=True, default="avatar-01")
    consent_given = Column(Boolean, nullable=False, default=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    parent = relationship("Parent", back_populates="students")
    enrolled_subjects = relationship(
        "StudentSubject",
        back_populates="student",
        cascade="all, delete-orphan",
    )
