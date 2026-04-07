"""SQLAlchemy ORM models for content.subjects, topics, taxonomies, and related tables."""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Text, DateTime, ARRAY, ForeignKey, Float, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


class Subject(Base):
    __tablename__ = "subjects"
    __table_args__ = {"schema": "content"}

    subject_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    slug = Column(String(50), unique=True, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    topics = relationship("Topic", back_populates="subject", cascade="all, delete-orphan")
    taxonomies = relationship(
        "MisconceptionTaxonomy", back_populates="subject", cascade="all, delete-orphan"
    )


class Topic(Base):
    __tablename__ = "topics"
    __table_args__ = {"schema": "content"}

    topic_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject_id = Column(
        UUID(as_uuid=True),
        ForeignKey("content.subjects.subject_id", ondelete="CASCADE"),
        nullable=False,
    )
    parent_topic_id = Column(
        UUID(as_uuid=True),
        ForeignKey("content.topics.topic_id", ondelete="SET NULL"),
        nullable=True,
    )
    name = Column(String(200), nullable=False)
    slug = Column(String(100), nullable=False)
    grade_level = Column(Integer, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    subject = relationship("Subject", back_populates="topics")
    children = relationship(
        "Topic",
        foreign_keys=[parent_topic_id],
        backref=__import__("sqlalchemy.orm", fromlist=["backref"]).backref(
            "parent_topic", remote_side="Topic.topic_id"
        ),
    )


class MisconceptionTaxonomy(Base):
    __tablename__ = "misconception_taxonomies"
    __table_args__ = {"schema": "content"}

    taxonomy_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject_id = Column(
        UUID(as_uuid=True),
        ForeignKey("content.subjects.subject_id", ondelete="CASCADE"),
        nullable=False,
    )
    tag = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    grade_levels = Column(ARRAY(Integer), nullable=False, default=lambda: [3])
    parent_tag = Column(String(100), nullable=True)
    generated_by = Column(String(20), nullable=False, default="static")
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    subject = relationship("Subject", back_populates="taxonomies")


class StudentSubject(Base):
    __tablename__ = "student_subjects"
    __table_args__ = {"schema": "content"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.students.student_id", ondelete="CASCADE"),
        nullable=False,
    )
    subject_id = Column(
        UUID(as_uuid=True),
        ForeignKey("content.subjects.subject_id", ondelete="CASCADE"),
        nullable=False,
    )
    enabled_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    student = relationship("Student", back_populates="enrolled_subjects")
    subject = relationship("Subject")


class GenerationRun(Base):
    __tablename__ = "generation_runs"
    __table_args__ = {"schema": "content"}

    run_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lesson_id = Column(
        UUID(as_uuid=True),
        ForeignKey("content.lessons.lesson_id", ondelete="SET NULL"),
        nullable=True,
    )
    strategy = Column(String(30), nullable=False)
    topic = Column(Text, nullable=False)
    subject_id = Column(
        UUID(as_uuid=True),
        ForeignKey("content.subjects.subject_id", ondelete="SET NULL"),
        nullable=True,
    )
    grade_level = Column(Integer, nullable=False)
    student_id = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.students.student_id", ondelete="SET NULL"),
        nullable=True,
    )
    prompt_hash = Column(Text, nullable=True)
    llm_model = Column(String(100), nullable=False, default="unknown")
    latency_ms = Column(Integer, nullable=True)
    accessibility_score = Column(Float, nullable=True)
    eval_scores = Column(JSON, nullable=False, default=dict)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


class FeedbackLog(Base):
    __tablename__ = "feedback_logs"
    __table_args__ = {"schema": "content"}

    log_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(100), nullable=False)
    session_id = Column(String(100), nullable=True)
    question_id = Column(String(100), nullable=False)
    feedback_type = Column(String(20), nullable=False)
    latency_ms = Column(Integer, nullable=True)
    llm_model = Column(String(100), nullable=True)
    misconception_type = Column(String(100), nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


class DiagnosticAssessment(Base):
    __tablename__ = "diagnostic_assessments"
    __table_args__ = {"schema": "content"}

    assessment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject_id = Column(
        UUID(as_uuid=True),
        ForeignKey("content.subjects.subject_id", ondelete="CASCADE"),
        nullable=False,
    )
    student_id = Column(
        UUID(as_uuid=True),
        ForeignKey("auth.students.student_id", ondelete="CASCADE"),
        nullable=True,
    )
    topic_id = Column(
        UUID(as_uuid=True),
        ForeignKey("content.topics.topic_id", ondelete="SET NULL"),
        nullable=True,
    )
    status = Column(String(20), nullable=False, default="pending")
    activities = Column(JSON, nullable=False, default=list)
    results = Column(JSON, nullable=True)
    weak_tags = Column(ARRAY(Text), nullable=False, default=list)
    requested_by = Column(String(10), nullable=False, default="parent")
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    completed_at = Column(DateTime(timezone=True), nullable=True)
