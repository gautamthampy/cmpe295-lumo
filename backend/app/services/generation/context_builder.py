"""
GenerationContextBuilder — assembles a GenerationContext from DB lookups.

Centralises all DB reads so strategies stay pure (no DB access inside strategies).
"""
from __future__ import annotations

import logging
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.subject import MisconceptionTaxonomy, Subject
from app.services.generation.base import GenerationContext

logger = logging.getLogger(__name__)

# How many days of recent events to consider for "recent errors"
_RECENT_DAYS = 14


class GenerationContextBuilder:
    def __init__(self, db: Session):
        self.db = db

    async def build(
        self,
        topic: str,
        subject: Subject,
        grade_level: int,
        student_id: Optional[UUID] = None,
    ) -> GenerationContext:
        misconception_tags = self._load_taxonomy_tags(subject, grade_level)
        mastery_scores = self._load_mastery_scores(student_id, subject.subject_id)
        recent_errors = self._load_recent_errors(student_id)
        zpd_lower, zpd_upper = self._estimate_zpd(mastery_scores)

        return GenerationContext(
            topic=topic,
            subject_name=subject.name,
            grade_level=grade_level,
            student_id=student_id,
            misconception_tags=misconception_tags,
            mastery_scores=mastery_scores,
            recent_errors=recent_errors,
            zpd_lower=zpd_lower,
            zpd_upper=zpd_upper,
        )

    def _load_taxonomy_tags(self, subject: Subject, grade_level: int) -> list[str]:
        """Fetch misconception tags for this subject + grade from the taxonomy table."""
        taxonomies = (
            self.db.query(MisconceptionTaxonomy)
            .filter(
                MisconceptionTaxonomy.subject_id == subject.subject_id,
                MisconceptionTaxonomy.grade_levels.any(grade_level),
            )
            .order_by(MisconceptionTaxonomy.parent_tag.nullsfirst())
            .limit(20)
            .all()
        )
        return [t.tag for t in taxonomies]

    def _load_mastery_scores(
        self, student_id: Optional[UUID], subject_id: UUID
    ) -> dict[str, float]:
        """
        Load mastery scores from learner.mastery_scores for this student.
        Returns {tag: score} using lesson misconception_tags as proxies for KCs.
        If student_id is None, returns empty dict (anonymous session).
        """
        if not student_id:
            return {}
        try:
            from app.models.lesson import Lesson

            rows = (
                self.db.query(Lesson)
                .filter(Lesson.subject == subject_id)
                .all()
            )
            # learner.mastery_scores is keyed on lesson_id, not tags.
            # We approximate tag mastery as the mastery score of lessons that carry that tag.
            from app.models.lesson import Lesson as LessonModel
            from sqlalchemy import text

            result = self.db.execute(
                text(
                    """
                    SELECT ms.score, l.misconception_tags
                    FROM learner.mastery_scores ms
                    JOIN content.lessons l ON l.lesson_id = ms.lesson_id
                    WHERE ms.user_id = :uid
                    """
                ),
                {"uid": str(student_id)},
            ).fetchall()

            tag_scores: dict[str, list[float]] = {}
            for row in result:
                score, tags = row.score, row.misconception_tags or []
                for tag in tags:
                    tag_scores.setdefault(tag, []).append(score)

            return {tag: sum(scores) / len(scores) for tag, scores in tag_scores.items()}
        except Exception as e:
            logger.warning(f"Failed to load mastery scores: {e}")
            return {}

    def _load_recent_errors(self, student_id: Optional[UUID]) -> list[str]:
        """
        Fetch misconception tags from incorrect activity answers in the last 14 days.
        Reads from events.user_events where event_type = 'activity_incorrect'.
        """
        if not student_id:
            return []
        try:
            from sqlalchemy import text

            rows = self.db.execute(
                text(
                    """
                    SELECT DISTINCT event_data->>'misconception_tag' AS tag
                    FROM events.user_events
                    WHERE user_id = :uid
                      AND event_type = 'activity_incorrect'
                      AND created_at > NOW() - INTERVAL ':days days'
                      AND event_data->>'misconception_tag' IS NOT NULL
                    ORDER BY tag
                    LIMIT 10
                    """
                ),
                {"uid": str(student_id), "days": _RECENT_DAYS},
            ).fetchall()
            return [row.tag for row in rows if row.tag]
        except Exception as e:
            logger.warning(f"Failed to load recent errors: {e}")
            return []

    def _estimate_zpd(self, mastery_scores: dict[str, float]) -> tuple[float, float]:
        """Estimate ZPD lower/upper bounds from current mastery profile."""
        if not mastery_scores:
            return 0.35, 0.60  # defaults for unknown student
        avg = sum(mastery_scores.values()) / len(mastery_scores)
        lower = max(0.0, avg - 0.15)
        upper = min(1.0, avg + 0.25)
        return lower, upper
