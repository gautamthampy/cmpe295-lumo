"""
PlannerService — orchestrates student learning path recommendations.

Aggregates signals from:
- Attention Agent (recent attention scores, drift status)
- Analytics (mastery scores, completion data)
- Feedback Agent (recent hint/explanation usage)

Returns a ranked list of recommended next actions.
"""
from __future__ import annotations

import logging
from typing import Optional
from uuid import UUID

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.models.attention import AttentionMetric
from app.models.events import UserEvent
from app.models.subject import FeedbackLog
from app.services.attention_engine import get_drift_status

logger = logging.getLogger(__name__)


class LearningRecommendation:
    """A single recommended action for the student."""

    def __init__(
        self,
        action: str,
        reason: str,
        priority: float,
        metadata: dict | None = None,
    ):
        self.action = action
        self.reason = reason
        self.priority = priority
        self.metadata = metadata or {}

    def to_dict(self) -> dict:
        return {
            "action": self.action,
            "reason": self.reason,
            "priority": round(self.priority, 2),
            **self.metadata,
        }


class PlannerService:
    """
    Planner Agent — the orchestrator described in the project workbook (§6.3.1).

    Responsibilities:
    1. Assess current student state (attention, mastery, errors)
    2. Determine optimal next learning activity
    3. Select appropriate content difficulty
    """

    def __init__(self, db: Session):
        self.db = db

    def recommend(
        self,
        student_id: UUID,
        session_id: Optional[UUID] = None,
        limit: int = 3,
    ) -> list[dict]:
        """
        Generate a ranked list of next-best-actions for the student.

        Signals considered:
        - Recent attention score and drift status
        - Number of lessons completed / quizzes taken
        - Recent feedback log entries (hint usage indicates struggle)
        - Time-of-day vs historical attention peaks
        """
        recommendations: list[LearningRecommendation] = []

        # ── 1. Attention signal ──────────────────────────────────────
        attention = self._get_attention_state(student_id, session_id)
        if attention["drift"]:
            if attention.get("recommended_action") == "recap":
                recommendations.append(
                    LearningRecommendation(
                        action="micro_recap",
                        reason="Because your attention dipped, a quick recap can help you lock in the key idea before moving on.",
                        priority=0.95,
                        metadata={"attention_score": attention["score"]},
                    )
                )
            else:
                recommendations.append(
                    LearningRecommendation(
                        action="take_break",
                        reason="Attention drift detected. A short break will help you refocus.",
                        priority=0.95,
                        metadata={"attention_score": attention["score"]},
                    )
                )
        elif attention["score"] < 0.5:
            recommendations.append(
                LearningRecommendation(
                    action="switch_to_interactive",
                    reason="Your focus is dipping — try an interactive activity to re-engage.",
                    priority=0.8,
                    metadata={"attention_score": attention["score"]},
                )
            )

        # ── 2. Recent struggle signal (feedback usage) ───────────────
        recent_hints = self._get_recent_feedback_count(student_id, "hint_generated")
        recent_explanations = self._get_recent_feedback_count(student_id, "explanation_generated")
        if recent_hints >= 3 or recent_explanations >= 2:
            recommendations.append(
                LearningRecommendation(
                    action="review_lesson",
                    reason="You've been asking for lots of hints — revisiting the lesson material may help.",
                    priority=0.75,
                    metadata={
                        "hints_used": recent_hints,
                        "explanations_used": recent_explanations,
                    },
                )
            )

        # ── 3. Progress signal ───────────────────────────────────────
        progress = self._get_progress(student_id)
        if progress["quizzes_taken"] > 0 and progress["lessons_completed"] == 0:
            recommendations.append(
                LearningRecommendation(
                    action="complete_lesson",
                    reason="You've taken quizzes but haven't completed a lesson yet — try finishing one!",
                    priority=0.7,
                )
            )

        # ── 4. Default: continue learning ────────────────────────────
        if not recommendations or all(r.priority < 0.6 for r in recommendations):
            recommendations.append(
                LearningRecommendation(
                    action="continue_learning",
                    reason="You're doing great! Keep going with the next lesson.",
                    priority=0.5,
                )
            )

        # Sort by priority descending, take top `limit`
        recommendations.sort(key=lambda r: r.priority, reverse=True)
        return [r.to_dict() for r in recommendations[:limit]]

    # ── Private helpers ──────────────────────────────────────────────

    def _get_attention_state(
        self, student_id: UUID, session_id: Optional[UUID]
    ) -> dict:
        """Get latest attention score and drift status."""
        row = (
            self.db.query(AttentionMetric)
            .filter(AttentionMetric.user_id == student_id)
            .order_by(desc(AttentionMetric.recorded_at))
            .first()
        )
        if not row or row.attention_score is None:
            return {"score": 1.0, "drift": False}

        score = float(row.attention_score)
        sid = str(session_id) if session_id else (str(row.session_id) if row.session_id else "unknown")
        drift, recommended_action = get_drift_status(
            user_id=str(student_id),
            session_id=sid,
        )
        return {"score": score, "drift": drift, "recommended_action": recommended_action}

    def _get_recent_feedback_count(self, student_id: UUID, event_type: str) -> int:
        """Count feedback events of a given type in the last 30 minutes."""
        from datetime import datetime, timedelta, timezone

        cutoff = datetime.now(timezone.utc) - timedelta(minutes=30)
        count = (
            self.db.query(func.count(FeedbackLog.log_id))
            .filter(
                FeedbackLog.user_id == str(student_id),
                FeedbackLog.feedback_type == event_type,
                FeedbackLog.created_at >= cutoff,
            )
            .scalar()
        )
        return count or 0

    def _get_progress(self, student_id: UUID) -> dict:
        """Get basic progress metrics from user events."""
        lessons = (
            self.db.query(func.count(UserEvent.event_id))
            .filter(
                UserEvent.user_id == student_id,
                UserEvent.event_type == "lesson_completed",
            )
            .scalar()
            or 0
        )
        quizzes = (
            self.db.query(func.count(UserEvent.event_id))
            .filter(
                UserEvent.user_id == student_id,
                UserEvent.event_type == "quiz_completed",
            )
            .scalar()
            or 0
        )
        return {
            "lessons_completed": int(lessons),
            "quizzes_taken": int(quizzes),
        }
