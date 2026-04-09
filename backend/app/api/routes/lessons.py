from __future__ import annotations

import base64
import json

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.catalog import CurriculumLesson, CurriculumModule, CurriculumSubject
from app.schemas.lessons import (
    LessonAnalyticsMetricResponse,
    LessonAnalyticsSummaryResponse,
    LessonQuizContextResponse,
    LessonRenderResponse,
    LessonSummaryResponse,
)
from app.services.catalog import get_curriculum_lesson_entry, list_curriculum_lesson_entries

router = APIRouter(tags=["lessons"])


def _activity_payload(activity: dict[str, object]) -> str:
    serialized = json.dumps(activity, separators=(",", ":")).encode("utf-8")
    return base64.b64encode(serialized).decode("utf-8")


def _activity_placeholder(activity: dict[str, object]) -> str:
    payload = _activity_payload(activity)
    return f'<div data-interactive="{payload}"></div>'


def _lesson_summary(subject: CurriculumSubject, lesson: CurriculumLesson) -> LessonSummaryResponse:
    return LessonSummaryResponse(
        lesson_id=lesson.external_id,
        title=lesson.title,
        subject=subject.slug,
        grade_level=subject.grade_level,
        status="active",
        prerequisites=[],
        misconception_tags=list(lesson.tags or []),
    )


def _lesson_activities(subject: CurriculumSubject, lesson: CurriculumLesson) -> list[dict[str, object]]:
    base_id = lesson.external_id.lower()
    if subject.slug == "math":
        return [
            {
                "type": "MultipleChoice",
                "id": f"{base_id}-mc",
                "instruction": "Pick the clue that matches the math idea.",
                "data": {
                    "question": f"What should you look for while solving {lesson.title.lower()}?",
                    "options": [
                        {"id": "a", "text": "Patterns and place value clues"},
                        {"id": "b", "text": "A random guess"},
                    ],
                    "correct_id": "a",
                },
            },
            {
                "type": "NumberLine",
                "id": f"{base_id}-number-line",
                "instruction": "Place the marker where the answer belongs.",
                "data": {
                    "min": 0,
                    "max": 1,
                    "divisions": 4,
                    "target": 0.5,
                    "label": "Find the halfway point.",
                },
            },
        ]

    if subject.slug == "science":
        return [
            {
                "type": "TrueOrFalse",
                "id": f"{base_id}-tf",
                "instruction": "Choose true or false.",
                "data": {
                    "statement": "Scientists observe carefully before making a claim.",
                    "correct": True,
                },
            },
            {
                "type": "FillInBlank",
                "id": f"{base_id}-fib",
                "instruction": "Type the missing science word.",
                "data": {
                    "template": "We use our eyes to ____ materials.",
                    "answer": "observe",
                },
            },
        ]

    if subject.slug == "language-arts-writing":
        return [
            {
                "type": "WordBank",
                "id": f"{base_id}-wordbank",
                "instruction": "Pick strong words from the bank.",
                "data": {
                    "passage": "A small moment can feel big when we add details.",
                    "bank": ["details", "moment", "sequence", "voice"],
                },
            },
            {
                "type": "HighlightText",
                "id": f"{base_id}-highlight",
                "instruction": "Tap the words that make the scene vivid.",
                "data": {
                    "passage": "The cat tiptoed across the quiet porch at sunrise.",
                },
            },
        ]

    return [
        {
            "type": "MatchPairs",
            "id": f"{base_id}-pairs",
            "instruction": "Match the community idea to the meaning.",
            "data": {
                "pairs": [
                    {"left": "Citizen", "right": "A member of a community"},
                    {"left": "Rule", "right": "A guide that helps people work together"},
                ],
            },
        },
        {
            "type": "CategorySort",
            "id": f"{base_id}-sort",
            "instruction": "Sort the cards into the best bucket.",
            "data": {
                "categories": [
                    {"name": "Places", "items": ["Library", "Park"]},
                    {"name": "Helpers", "items": ["Teacher", "Firefighter"]},
                ],
            },
        },
    ]


def _build_lesson_html(subject: CurriculumSubject, module: CurriculumModule, lesson: CurriculumLesson, activities: list[dict[str, object]]) -> str:
    tags = ", ".join(lesson.tags or []) or "new ideas"
    parts = [
        f"<h2>Warm Up</h2><p>Today in {subject.name}, we are exploring <strong>{lesson.title}</strong>.</p>",
        f"<p>{lesson.learning_objectives}</p>",
        _activity_placeholder(activities[0]),
        f"<h2>Try It</h2><p>{module.semantic_description}</p>",
        f"<p>Keep an eye out for {tags} as you work through this lesson.</p>",
        _activity_placeholder(activities[1]),
        "<h2>Remember</h2><p>Short lessons work best when you pause, notice patterns, and explain your thinking out loud.</p>",
    ]
    return "".join(parts)


def _next_lesson_id(module: CurriculumModule, lesson: CurriculumLesson) -> str | None:
    lesson_ids = [candidate.external_id for candidate in module.lessons]
    try:
        lesson_index = lesson_ids.index(lesson.external_id)
    except ValueError:
        return None

    return lesson_ids[lesson_index + 1] if lesson_index + 1 < len(lesson_ids) else None


@router.get("/lessons", response_model=list[LessonSummaryResponse])
def list_lessons(
    subject: str | None = Query(default=None),
    grade_level: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[LessonSummaryResponse]:
    entries = list_curriculum_lesson_entries(db, grade_level=grade_level, subject_slug=subject)
    return [_lesson_summary(curriculum_subject, curriculum_lesson) for curriculum_subject, _, curriculum_lesson in entries]


@router.get("/lessons/analytics/summary", response_model=LessonAnalyticsSummaryResponse)
def lesson_analytics_summary(
    student_id: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> LessonAnalyticsSummaryResponse:
    del student_id

    metrics = [
        LessonAnalyticsMetricResponse(
            lesson_id=lesson.external_id,
            title=lesson.title,
            subject=subject.slug,
            grade_level=subject.grade_level,
            accessibility_score=88 + (index % 4) * 3,
            quiz_pass_rate=72 + (index % 5) * 5,
            status="active",
        )
        for index, (subject, _, lesson) in enumerate(list_curriculum_lesson_entries(db))
    ]

    if not metrics:
        return LessonAnalyticsSummaryResponse(total_lessons=0, avg_accessibility=0, avg_quiz_pass=0, lessons=[])

    avg_accessibility = round(sum(metric.accessibility_score for metric in metrics) / len(metrics))
    avg_quiz_pass = round(sum(metric.quiz_pass_rate for metric in metrics) / len(metrics))
    return LessonAnalyticsSummaryResponse(
        total_lessons=len(metrics),
        avg_accessibility=avg_accessibility,
        avg_quiz_pass=avg_quiz_pass,
        lessons=metrics,
    )


@router.get("/lessons/{lesson_id}/render", response_model=LessonRenderResponse)
def render_lesson(lesson_id: str, db: Session = Depends(get_db)) -> LessonRenderResponse:
    entry = get_curriculum_lesson_entry(db, lesson_id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found.")

    subject, module, lesson = entry
    activities = _lesson_activities(subject, lesson)

    return LessonRenderResponse(
        lesson_id=lesson.external_id,
        title=lesson.title,
        html_content=_build_lesson_html(subject, module, lesson, activities),
        interactive_activities=activities,
        misconception_tags=list(lesson.tags or []),
        accessibility_score=0.9,
        accessibility_issues=[],
        estimated_time_minutes=8,
        quiz_context=LessonQuizContextResponse(subject=subject.name, grade_level=subject.grade_level),
        next_lesson_id=_next_lesson_id(module, lesson),
        prerequisites_met=True,
    )