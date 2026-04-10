import uuid

from fastapi.testclient import TestClient

from app.core.database import SessionLocal
from app.main import app
from app.models.catalog import CurriculumLesson
from app.models.learner_mastery import LearnerMasteryScore


def test_quiz_generation_adapts_to_mastery_band():
    """
    Phase 3 rule:
    - mastery >= 0.8 -> harder (hard)
    - mastery <= 0.4 -> easier (easy)
    """
    client = TestClient(app)
    user_id = str(uuid.uuid4())

    with SessionLocal() as db:
        lesson = (
            db.query(CurriculumLesson)
            .filter(CurriculumLesson.external_id == "MATH_G2_M1_L1")
            .first()
        )
        assert lesson is not None, "Seeded curriculum lesson MATH_G2_M1_L1 required"
        lesson_uuid = uuid.UUID(str(lesson.id))

        # High mastery -> hard
        db.query(LearnerMasteryScore).filter(
            LearnerMasteryScore.user_id == uuid.UUID(user_id),
        ).delete()
        db.add(
            LearnerMasteryScore(
                user_id=uuid.UUID(user_id),
                lesson_id=lesson_uuid,
                score=0.9,
                attempts=3,
            )
        )
        db.commit()

    res = client.post(
        "/api/v1/lessons/MATH_G2_M1_L1/quiz",
        json={"user_id": user_id},
    )
    assert res.status_code == 200
    payload = res.json()
    assert payload["lesson_id"] == "MATH_G2_M1_L1"
    assert any(q.get("difficulty") == "hard" for q in payload.get("questions", []))

    with SessionLocal() as db:
        # Low mastery -> easy
        db.query(LearnerMasteryScore).filter(
            LearnerMasteryScore.user_id == uuid.UUID(user_id),
        ).delete()
        db.add(
            LearnerMasteryScore(
                user_id=uuid.UUID(user_id),
                lesson_id=lesson_uuid,
                score=0.2,
                attempts=1,
            )
        )
        db.commit()

    res = client.post(
        "/api/v1/lessons/MATH_G2_M1_L1/quiz",
        json={"user_id": user_id},
    )
    assert res.status_code == 200
    payload = res.json()
    assert any(q.get("difficulty") == "easy" for q in payload.get("questions", []))

