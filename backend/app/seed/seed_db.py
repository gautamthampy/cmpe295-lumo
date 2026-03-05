"""
Database seeding script.

Usage:
    python -m app.seed.seed_db           # seed if DB is empty
    python -m app.seed.seed_db --force   # delete existing lessons and re-seed
"""
import sys
import uuid
from datetime import datetime, timezone

from sqlalchemy import inspect, text

from app.core.database import SessionLocal
from app.models.lesson import Lesson
from app.models.auth import Parent, Student
from app.models.subject import Subject, StudentSubject
from app.seed.lesson_data import SEED_LESSONS
from app.services.auth_service import get_auth_service


def ensure_lessons_schema() -> None:
    """
    Backfill legacy DBs to match the current Lesson model.
    """
    db = SessionLocal()
    try:
        table_inspector = inspect(db.bind)
        existing_columns = {
            column["name"]
            for column in table_inspector.get_columns("lessons", schema="content")
        }

        backfill_columns = {
            "prerequisites": "UUID[] NOT NULL DEFAULT '{}'::UUID[]",
            "status": "VARCHAR(20) NOT NULL DEFAULT 'draft'",
            "version": "INTEGER NOT NULL DEFAULT 1",
            "parent_version_id": (
                "UUID REFERENCES content.lessons(lesson_id) ON DELETE SET NULL"
            ),
            "created_at": "TIMESTAMPTZ NOT NULL DEFAULT NOW()",
            "updated_at": "TIMESTAMPTZ NOT NULL DEFAULT NOW()",
        }

        added_columns: list[str] = []
        for column_name, column_sql in backfill_columns.items():
            if column_name not in existing_columns:
                db.execute(
                    text(
                        f"""
                        ALTER TABLE content.lessons
                        ADD COLUMN {column_name} {column_sql}
                        """
                    )
                )
                added_columns.append(column_name)

        if added_columns:
            db.commit()
            print(
                f"Added missing columns in content.lessons: {', '.join(added_columns)}"
            )
    finally:
        db.close()


def seed(force: bool = False) -> None:
    ensure_lessons_schema()
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

        # Pass 1: insert all lessons without prerequisites
        lessons_by_title: dict[str, Lesson] = {}
        for data in SEED_LESSONS:
            lesson = Lesson(
                lesson_id=uuid.uuid4(),
                title=data["title"],
                subject=data["subject"],
                grade_level=data["grade_level"],
                content_mdx=data["content_mdx"],
                misconception_tags=data["misconception_tags"],
                prerequisites=[],
                status="active",
                version=1,
                created_at=now,
                updated_at=now,
            )
            db.add(lesson)
            lessons_by_title[data["title"]] = lesson

        db.flush()  # assign IDs without committing

        # Pass 2: wire prerequisites by title
        for data in SEED_LESSONS:
            prereq_titles = data.get("prerequisite_titles", [])
            if prereq_titles:
                lesson = lessons_by_title[data["title"]]
                lesson.prerequisites = [
                    lessons_by_title[t].lesson_id
                    for t in prereq_titles
                    if t in lessons_by_title
                ]

        db.commit()
        print(f"Seeded {len(SEED_LESSONS)} lessons successfully.")

        # Print learning path summary
        for title, lesson in lessons_by_title.items():
            prereq_count = len(lesson.prerequisites) if lesson.prerequisites else 0
            print(f"  - {title} (prereqs: {prereq_count})")

    finally:
        db.close()


def seed_demo_accounts() -> None:
    """Seed a demo parent + student account for development and demos."""
    db = SessionLocal()
    try:
        auth = get_auth_service()

        # Demo parent
        demo_email = "demo@lumo.app"
        parent = db.query(Parent).filter(Parent.email == demo_email).first()
        if not parent:
            parent = Parent(
                email=demo_email,
                password_hash=auth.hash_password("demo1234"),
                display_name="Demo Parent",
            )
            db.add(parent)
            db.flush()
            print(f"Created demo parent: {demo_email} / demo1234")
        else:
            print(f"Demo parent already exists: {demo_email}")

        # Demo student
        existing_student = db.query(Student).filter(
            Student.parent_id == parent.parent_id,
            Student.display_name == "Alex",
        ).first()
        if not existing_student:
            student = Student(
                parent_id=parent.parent_id,
                display_name="Alex",
                grade_level=3,
                pin_hash=auth.hash_pin("1234"),
                avatar_id="avatar-01",
                consent_given=True,
            )
            db.add(student)
            db.flush()
            print("Created demo student: Alex (PIN: 1234)")

            # Enroll in Math and English
            for slug in ("math", "english"):
                subject = db.query(Subject).filter(Subject.slug == slug).first()
                if subject:
                    enrollment = StudentSubject(
                        student_id=student.student_id,
                        subject_id=subject.subject_id,
                    )
                    db.add(enrollment)
            print("  Enrolled Alex in Mathematics and English Language Arts")
        else:
            print("Demo student Alex already exists")

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Warning: demo account seeding failed: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    force = "--force" in sys.argv
    seed(force=force)
    seed_demo_accounts()
