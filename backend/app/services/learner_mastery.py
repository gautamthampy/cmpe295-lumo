"""Upsert mastery from quiz telemetry; helpers for curriculum lesson resolution."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.catalog import CurriculumLesson
from app.models.learner_mastery import LearnerMasteryScore
from app.schemas.telemetry import QuizCompletedData

logger = logging.getLogger(__name__)


def curriculum_lesson_uuid_for_external_id(db: Session, external_id: str) -> UUID | None:
    row = (
        db.query(CurriculumLesson)
        .filter(CurriculumLesson.external_id == external_id)
        .first()
    )
    if row is None:
        return None
    try:
        return UUID(str(row.id))
    except (ValueError, TypeError):
        return None


def upsert_mastery_from_quiz_completed(
    db: Session,
    user_id: UUID,
    data: QuizCompletedData,
) -> None:
    """Update learner.mastery_scores from a validated quiz_completed event (latest score wins)."""
    if data.lesson_id is None:
        return
    lesson_uuid = curriculum_lesson_uuid_for_external_id(db, data.lesson_id)
    if lesson_uuid is None:
        logger.debug("No curriculum lesson for external_id=%s; skipping mastery upsert", data.lesson_id)
        return

    if data.total_questions <= 0:
        return
    new_score = max(0.0, min(1.0, float(data.score) / float(data.total_questions)))

    row = (
        db.query(LearnerMasteryScore)
        .filter(
            LearnerMasteryScore.user_id == user_id,
            LearnerMasteryScore.lesson_id == lesson_uuid,
        )
        .first()
    )
    now = datetime.now(timezone.utc)
    if row is None:
        db.add(
            LearnerMasteryScore(
                user_id=user_id,
                lesson_id=lesson_uuid,
                score=new_score,
                attempts=1,
                updated_at=now,
            )
        )
    else:
        row.score = new_score
        row.attempts = int(row.attempts or 0) + 1
        row.updated_at = now
