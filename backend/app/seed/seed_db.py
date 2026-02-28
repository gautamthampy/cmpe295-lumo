"""
Database seeding script.

Usage:
    python -m app.seed.seed_db           # seed if DB is empty
    python -m app.seed.seed_db --force   # delete existing lessons and re-seed
"""
import sys
import uuid
from datetime import datetime, timezone

from app.core.database import SessionLocal
from app.models.lesson import Lesson
from app.seed.lesson_data import SEED_LESSONS


def seed(force: bool = False) -> None:
    db = SessionLocal()
    try:
        existing = db.query(Lesson).count()

        if existing > 0 and not force:
            print(f"Database already has {existing} lessons. Use --force to re-seed.")
            return

        if force and existing > 0:
            print(f"--force: deleting {existing} existing lessons...")
            db.query(Lesson).delete()
            db.commit()

        now = datetime.now(timezone.utc)
        for data in SEED_LESSONS:
            lesson = Lesson(
                lesson_id=uuid.uuid4(),
                title=data["title"],
                subject=data["subject"],
                grade_level=data["grade_level"],
                content_mdx=data["content_mdx"],
                misconception_tags=data["misconception_tags"],
                status="active",
                version=1,
                created_at=now,
                updated_at=now,
            )
            db.add(lesson)

        db.commit()
        print(f"Seeded {len(SEED_LESSONS)} lessons successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    force = "--force" in sys.argv
    seed(force=force)
