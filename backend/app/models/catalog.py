from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class CurriculumSubject(Base):
    __tablename__ = "curriculum_subjects"
    __table_args__ = (UniqueConstraint("grade_level", "slug", name="uq_curriculum_subject_grade_slug"),)

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    grade_level: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), nullable=False)
    curriculum_provider: Mapped[str] = mapped_column(String(160), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, server_default=func.now())

    modules: Mapped[list[CurriculumModule]] = relationship(
        back_populates="subject",
        cascade="all, delete-orphan",
        order_by="CurriculumModule.position",
    )


class CurriculumModule(Base):
    __tablename__ = "curriculum_modules"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    subject_id: Mapped[str] = mapped_column(Uuid(as_uuid=False), ForeignKey("curriculum_subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    external_id: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    semantic_description: Mapped[str] = mapped_column(Text, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, server_default=func.now())

    subject: Mapped[CurriculumSubject] = relationship(back_populates="modules")
    lessons: Mapped[list[CurriculumLesson]] = relationship(
        back_populates="module",
        cascade="all, delete-orphan",
        order_by="CurriculumLesson.position",
    )


class CurriculumLesson(Base):
    __tablename__ = "curriculum_lessons"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    module_id: Mapped[str] = mapped_column(Uuid(as_uuid=False), ForeignKey("curriculum_modules.id", ondelete="CASCADE"), nullable=False, index=True)
    external_id: Mapped[str] = mapped_column(String(80), nullable=False, unique=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    learning_objectives: Mapped[str] = mapped_column(Text, nullable=False)
    tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, server_default=func.now())

    module: Mapped[CurriculumModule] = relationship(back_populates="lessons")