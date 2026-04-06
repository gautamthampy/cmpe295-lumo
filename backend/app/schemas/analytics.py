"""Pydantic schemas for analytics and attention events."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List
from uuid import UUID

from pydantic import BaseModel, Field


class Event(BaseModel):
    """Generic LUMO event, aligned with docs/event_schema.json."""

    event_type: str
    timestamp: datetime
    user_id: UUID
    session_id: UUID
    data: Dict[str, Any] = Field(default_factory=dict)


class AttentionMiniTestStartedData(BaseModel):
    """Payload for attention_mini_test_started."""

    test_id: UUID | None = None
    trigger: str | None = None


class AttentionMiniTestCompletedData(BaseModel):
    """Payload for attention_mini_test_completed."""

    score: float = Field(..., ge=0.0, le=1.0)
    test_id: UUID | None = None
    correct_count: int | None = Field(None, ge=0)
    total_questions: int | None = Field(None, ge=1)
    time_taken_ms: int | None = Field(None, ge=0)


class AttentionSelfReportData(BaseModel):
    """Learner self-report of focus level."""

    focus_level: float = Field(..., ge=0.0, le=1.0)
    label: str | None = None


class GazeAttentionLikelihoodData(BaseModel):
    """Scalar gaze-derived likelihood only (privacy-safe)."""

    likelihood: float = Field(..., ge=0.0, le=1.0)


class AttentionSnapshot(BaseModel):
    recorded_at: datetime
    session_id: UUID | None = None
    lesson_id: UUID | None = None
    attention_score: float | None = None
    avg_response_latency_ms: int | None = None
    error_rate: float | None = None


class AttentionSummary(BaseModel):
    user_id: UUID
    recent: List[AttentionSnapshot]
    drift: bool
    recommended_action: str
