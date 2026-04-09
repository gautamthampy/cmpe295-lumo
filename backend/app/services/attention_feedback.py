"""Bridge attention signals to Feedback / Planner (minimal integration)."""
from __future__ import annotations

import logging
from uuid import UUID

logger = logging.getLogger(__name__)


def record_attention_signal(
    user_id: UUID,
    session_id: UUID,
    recommended_action: str,
    rationale: str,
) -> None:
    """Notify downstream consumers that attention recommends an action (recap/break/continue).

    Full Feedback Agent hint generation remains separate; this only records the signal.
    """
    logger.info(
        "attention_signal",
        extra={
            "user_id": str(user_id),
            "session_id": str(session_id),
            "recommended_action": recommended_action,
            "rationale": rationale[:500] if rationale else "",
        },
    )
