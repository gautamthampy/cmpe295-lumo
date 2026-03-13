import uuid
from datetime import datetime, timedelta, timezone

from app.core.database import SessionLocal
from app.models.attention import AttentionMetric
from app.services.attention_peaks import (
    AttentionPeakWindow,
    get_attention_peaks_for_user,
)
from app.models.lesson import Lesson  # ensure content.lessons is in metadata


def test_get_attention_peaks_for_user_basic():
    user_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    with SessionLocal() as db:
        # Clean out any prior metrics for this synthetic user to keep the test isolated.
        db.query(AttentionMetric).filter(AttentionMetric.user_id == user_id).delete()
        db.commit()

        # Insert synthetic metrics for two windows:
        # - Monday 09:00 with two high scores
        # - Tuesday 18:00 with one lower score
        rows = [
            AttentionMetric(
                user_id=user_id,
                session_id=None,
                lesson_id=None,
                attention_score=0.9,
                avg_response_latency_ms=800,
                error_rate=0.0,
                hour_of_day=9,
                day_of_week=0,  # Monday
                recorded_at=now - timedelta(days=1),
            ),
            AttentionMetric(
                user_id=user_id,
                session_id=None,
                lesson_id=None,
                attention_score=0.8,
                avg_response_latency_ms=900,
                error_rate=0.1,
                hour_of_day=9,
                day_of_week=0,  # Monday
                recorded_at=now - timedelta(days=1),
            ),
            AttentionMetric(
                user_id=user_id,
                session_id=None,
                lesson_id=None,
                attention_score=0.5,
                avg_response_latency_ms=2000,
                error_rate=0.3,
                hour_of_day=18,
                day_of_week=1,  # Tuesday
                recorded_at=now - timedelta(days=2),
            ),
        ]
        db.add_all(rows)
        db.commit()

        peaks = get_attention_peaks_for_user(
            db,
            user_id=user_id,
            window_days=7,
            min_samples=1,
            top_k=5,
        )

        # We should get at least the two windows we inserted.
        assert len(peaks) >= 2

        # The Monday 09:00 window should be ranked first with 2 samples and higher avg_score.
        top: AttentionPeakWindow = peaks[0]
        assert top.day_of_week == 0
        assert top.hour_of_day == 9
        assert top.samples == 2
        assert 0.84 < top.avg_score < 0.91

