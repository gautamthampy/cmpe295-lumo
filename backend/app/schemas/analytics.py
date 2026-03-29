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

