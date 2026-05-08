"""Validated telemetry payloads for Phase 2 analytics (aligned with docs/event_schema.json, pragmatic types).

Catalog lessons use string external_ids (not UUIDs); quiz question_id values are string slugs.
"""
from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class LessonStartedData(BaseModel):
    model_config = ConfigDict(extra="ignore")

    lesson_id: str = Field(..., min_length=1)
    lesson_title: str = Field(..., min_length=1)
    subject: str | None = None
    grade_level: int | None = Field(None, ge=1, le=12)


class LessonCompletedData(BaseModel):
    model_config = ConfigDict(extra="ignore")

    lesson_id: str = Field(..., min_length=1)
    time_spent_ms: int = Field(..., ge=0)
    completion_percentage: float | None = Field(None, ge=0, le=100)


class QuizStartedData(BaseModel):
    model_config = ConfigDict(extra="ignore")

    quiz_id: UUID
    lesson_id: str = Field(..., min_length=1)
    question_count: int | None = Field(None, ge=1)


class QuestionAnsweredData(BaseModel):
    model_config = ConfigDict(extra="ignore")

    question_id: str = Field(..., min_length=1)
    answer: str = Field(..., min_length=0)
    is_correct: bool
    response_latency_ms: int = Field(..., ge=0)
    lesson_id: str | None = None
    hint_requested: bool | None = None
    hint_level: int | None = Field(None, ge=1, le=3)
    misconception_type: str | None = None
    idle_ms: int | None = Field(None, ge=0)


class QuizCompletedData(BaseModel):
    model_config = ConfigDict(extra="ignore")

    quiz_id: UUID
    score: int = Field(..., ge=0)
    total_questions: int = Field(..., ge=1)
    time_spent_ms: int | None = Field(None, ge=0)
    lesson_id: str | None = None
    mastery_achieved: bool | None = None


def validate_persist_only_payload(event_type: str, data: dict[str, Any]) -> BaseModel | None:
    """Return validated model or raise ValidationError."""
    if event_type == "lesson_started":
        return LessonStartedData.model_validate(data)
    if event_type == "lesson_completed":
        return LessonCompletedData.model_validate(data)
    if event_type == "quiz_started":
        return QuizStartedData.model_validate(data)
    if event_type == "quiz_completed":
        return QuizCompletedData.model_validate(data)
    return None  # other PERSIST_ONLY types without strict Phase-2 validation
