from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.catalog import CurriculumLesson, CurriculumModule, CurriculumSubject

ELEMENTARY_CURRICULUM_SEED = {
    2: [
        {
            "name": "Mathematics",
            "slug": "math",
            "curriculum_provider": "Origo Stepping Stones 2.0",
            "modules": [
                {
                    "module_id": "MATH_G2_M1",
                    "module_title": "Module 1: Number, Operations, and Time",
                    "semantic_description": "Focuses on reading, writing, and comparing two-digit and three-digit numbers, foundational addition strategies, and reading analog clocks to the hour.",
                    "lessons": [
                        {
                            "lesson_id": "MATH_G2_M1_L1",
                            "lesson_title": "Reading and writing two-digit numbers",
                            "learning_objectives": "Students will convert number words up to 100 into digits and spell word names for numbers up to 20.",
                            "tags": ["place value", "two-digit numbers", "number words"],
                        },
                        {
                            "lesson_id": "MATH_G2_M1_L3",
                            "lesson_title": "Comparing and ordering two-digit numbers",
                            "learning_objectives": "Students will use greater than and less than concepts to order numbers up to 100.",
                            "tags": ["comparison", "ordering", "inequalities"],
                        },
                        {
                            "lesson_id": "MATH_G2_M1_L11",
                            "lesson_title": "Time: Reinforcing on the hour (analog)",
                            "learning_objectives": "Students will match analog clocks to digital times and written words for top-of-the-hour time telling.",
                            "tags": ["time", "analog clock", "measurement"],
                        },
                    ],
                }
            ],
        },
        {
            "name": "Science",
            "slug": "science",
            "curriculum_provider": "Twig Science",
            "modules": [
                {
                    "module_id": "SCI_G2_M2",
                    "module_title": "Module 2: Master of Materials",
                    "semantic_description": "An investigative unit where students explore the physical properties of matter, how materials respond to heating and cooling, and how to engineer structures.",
                    "lessons": [
                        {
                            "lesson_id": "SCI_G2_M2_L1",
                            "lesson_title": "Properties of Building Materials",
                            "learning_objectives": "Students will analyze different materials to determine their suitability for building structures based on flexibility, strength, and texture.",
                            "tags": ["matter", "physical properties", "engineering"],
                        },
                        {
                            "lesson_id": "SCI_G2_M2_L2",
                            "lesson_title": "Heating and Cooling Matter",
                            "learning_objectives": "Students investigate how the structure of materials changes when heated and cooled, using melting wax as an observable phenomenon.",
                            "tags": ["states of matter", "temperature", "reversible changes"],
                        },
                    ],
                }
            ],
        },
        {
            "name": "Language Arts - Writing",
            "slug": "language-arts-writing",
            "curriculum_provider": "Lucy Calkins Units of Study",
            "modules": [
                {
                    "module_id": "ELA_W_G2_U1",
                    "module_title": "Unit 1: Lessons from the Masters",
                    "semantic_description": "A narrative writing progression where students learn to stretch out small, focused moments into detailed stories using dialogue and descriptive actions.",
                    "lessons": [
                        {
                            "lesson_id": "ELA_W_G2_U1_L1",
                            "lesson_title": "Stretching Out Small Moments",
                            "learning_objectives": "Students will select a specific, narrow memory and write sequentially with focused details.",
                            "tags": ["narrative writing", "small moments", "sequencing"],
                        },
                        {
                            "lesson_id": "ELA_W_G2_U1_L2",
                            "lesson_title": "Bringing Characters to Life",
                            "learning_objectives": "Students will embed dialogue and specific character actions into their narrative drafts.",
                            "tags": ["dialogue", "character development", "drafting"],
                        },
                    ],
                }
            ],
        },
        {
            "name": "Social Studies",
            "slug": "social-studies",
            "curriculum_provider": "McGraw Hill IMPACT California",
            "modules": [
                {
                    "module_id": "SOC_G2_C1",
                    "module_title": "Chapter 1: We Do Our Part",
                    "semantic_description": "Explores the fundamental concepts of community, rules, laws, and the roles of active citizens within a local geography.",
                    "lessons": [
                        {
                            "lesson_id": "SOC_G2_C1_L1",
                            "lesson_title": "Citizenship and Rules",
                            "learning_objectives": "Students will define what it means to be a good citizen and explain why communities require rules and laws.",
                            "tags": ["citizenship", "rules", "civics"],
                        },
                        {
                            "lesson_id": "SOC_G2_C1_L2",
                            "lesson_title": "Geography of the Community",
                            "learning_objectives": "Students will distinguish between relative and absolute locations and map out key features of their immediate community.",
                            "tags": ["geography", "maps", "relative location"],
                        },
                    ],
                }
            ],
        },
    ]
}


def ensure_curriculum_catalog_seeded(db: Session, grade_level: int | None = None) -> None:
    target_grades = [grade_level] if grade_level is not None else sorted(ELEMENTARY_CURRICULUM_SEED)
    target_grades = [grade for grade in target_grades if grade in ELEMENTARY_CURRICULUM_SEED]
    if not target_grades:
        return

    existing_grades = set(
        db.scalars(
            select(CurriculumSubject.grade_level).where(CurriculumSubject.grade_level.in_(target_grades))
        ).all()
    )

    inserted = False
    for grade in target_grades:
        if grade in existing_grades:
            continue

        for subject_position, subject_data in enumerate(ELEMENTARY_CURRICULUM_SEED[grade], start=1):
            subject = CurriculumSubject(
                grade_level=grade,
                name=subject_data["name"],
                slug=subject_data["slug"],
                curriculum_provider=subject_data["curriculum_provider"],
                position=subject_position,
            )
            db.add(subject)
            db.flush()

            for module_position, module_data in enumerate(subject_data["modules"], start=1):
                module = CurriculumModule(
                    subject_id=subject.id,
                    external_id=module_data["module_id"],
                    title=module_data["module_title"],
                    semantic_description=module_data["semantic_description"],
                    position=module_position,
                )
                db.add(module)
                db.flush()

                for lesson_position, lesson_data in enumerate(module_data["lessons"], start=1):
                    db.add(
                        CurriculumLesson(
                            module_id=module.id,
                            external_id=lesson_data["lesson_id"],
                            title=lesson_data["lesson_title"],
                            learning_objectives=lesson_data["learning_objectives"],
                            tags=list(lesson_data["tags"]),
                            position=lesson_position,
                        )
                    )

        inserted = True

    if inserted:
        db.commit()


def list_curriculum_subjects(db: Session, grade_level: int | None = None) -> Sequence[CurriculumSubject]:
    ensure_curriculum_catalog_seeded(db, grade_level)

    stmt = select(CurriculumSubject).order_by(CurriculumSubject.grade_level, CurriculumSubject.position, CurriculumSubject.name)
    if grade_level is not None:
        stmt = stmt.where(CurriculumSubject.grade_level == grade_level)
        return db.scalars(stmt).all()

    subjects = db.scalars(stmt).all()
    unique_subjects: list[CurriculumSubject] = []
    seen_slugs: set[str] = set()
    for subject in subjects:
        if subject.slug in seen_slugs:
            continue
        seen_slugs.add(subject.slug)
        unique_subjects.append(subject)
    return unique_subjects


def get_grade_curriculum(db: Session, grade_level: int) -> Sequence[CurriculumSubject]:
    ensure_curriculum_catalog_seeded(db, grade_level)
    stmt = (
        select(CurriculumSubject)
        .where(CurriculumSubject.grade_level == grade_level)
        .options(selectinload(CurriculumSubject.modules).selectinload(CurriculumModule.lessons))
        .order_by(CurriculumSubject.position, CurriculumSubject.name)
    )
    return db.scalars(stmt).all()


def list_curriculum_lesson_entries(
    db: Session,
    *,
    grade_level: int | None = None,
    subject_slug: str | None = None,
) -> list[tuple[CurriculumSubject, CurriculumModule, CurriculumLesson]]:
    ensure_curriculum_catalog_seeded(db, grade_level)

    stmt = (
        select(CurriculumSubject)
        .options(selectinload(CurriculumSubject.modules).selectinload(CurriculumModule.lessons))
        .order_by(CurriculumSubject.grade_level, CurriculumSubject.position, CurriculumSubject.name)
    )
    if grade_level is not None:
        stmt = stmt.where(CurriculumSubject.grade_level == grade_level)

    subjects = db.scalars(stmt).all()
    entries: list[tuple[CurriculumSubject, CurriculumModule, CurriculumLesson]] = []
    for subject in subjects:
        if subject_slug is not None and subject.slug != subject_slug:
            continue

        for module in subject.modules:
            for lesson in module.lessons:
                entries.append((subject, module, lesson))

    return entries


def get_curriculum_lesson_entry(db: Session, lesson_id: str) -> tuple[CurriculumSubject, CurriculumModule, CurriculumLesson] | None:
    for subject, module, lesson in list_curriculum_lesson_entries(db):
        if lesson.external_id == lesson_id:
            return subject, module, lesson
    return None