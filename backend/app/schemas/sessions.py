from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class SessionCreate(BaseModel):
    user_id: UUID
    device_type: str | None = None
    user_agent: str | None = None


class SessionResponse(BaseModel):
    session_id: UUID
    user_id: UUID
    started_at: datetime
    ended_at: datetime | None = None
    device_type: str | None = None
    user_agent: str | None = None

