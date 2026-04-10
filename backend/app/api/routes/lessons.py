from __future__ import annotations

import base64
import json
import logging
from collections import defaultdict
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.catalog import CurriculumLesson, CurriculumModule, CurriculumSubject
from app.models.events import UserEvent
from app.schemas.lessons import (
    LessonAnalyticsMetricResponse,
    LessonAnalyticsSummaryResponse,
    LessonQuizContextResponse,
    LessonRenderResponse,
    LessonSummaryResponse,
)
from app.services.catalog import get_curriculum_lesson_entry, list_curriculum_lesson_entries

logger = logging.getLogger(__name__)

router = APIRouter(tags=["lessons"])

# Matches `accessibility_score` in lesson render (0.9 → 90) when we have no per-learner telemetry.
_CATALOG_ACCESSIBILITY_SCORE = 90


def _aggregate_lesson_events_for_student(
    db: Session, student_id: UUID
) -> tuple[dict[str, list[float]], dict[str, int]]:
    """Quiz attempt pass rates (0–100) and section_view counts per lesson from `events.user_events`."""
    rates_by_lesson: dict[str, list[float]] = defaultdict(list)
    sections_by_lesson: dict[str, int] = defaultdict(int)
    rows = db.query(UserEvent).filter(UserEvent.user_id == student_id).all()
    for row in rows:
        payload = row.event_data if isinstance(row.event_data, dict) else {}
        ev = payload.get("event") or row.event_type
        lid = payload.get("lesson_id")
        if not isinstance(lid, str):
            continue
        if ev == "quiz_submit":
            score = payload.get("quiz_score")
            total = payload.get("quiz_total")
            if isinstance(score, (int, float)) and isinstance(total, (int, float)) and float(total) > 0:
                rates_by_lesson[lid].append(100.0 * float(score) / float(total))
        elif ev == "section_view":
            sections_by_lesson[lid] += 1
    return dict(rates_by_lesson), dict(sections_by_lesson)


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
    entries = list_curriculum_lesson_entries(db)

    student_uuid: UUID | None = None
    if student_id:
        try:
            student_uuid = UUID(student_id)
        except ValueError:
            student_uuid = None

    rates_by_lesson: dict[str, list[float]] = {}
    sections_by_lesson: dict[str, int] = {}
    if student_uuid:
        rates_by_lesson, sections_by_lesson = _aggregate_lesson_events_for_student(db, student_uuid)

    metrics: list[LessonAnalyticsMetricResponse] = []
    for subject, _, lesson in entries:
        lid = lesson.external_id
        if student_uuid and rates_by_lesson.get(lid):
            quiz_pass = round(sum(rates_by_lesson[lid]) / len(rates_by_lesson[lid]))
        else:
            quiz_pass = 0

        if student_uuid and sections_by_lesson.get(lid, 0) > 0:
            accessibility_score = min(100, 65 + min(sections_by_lesson[lid], 7) * 5)
        else:
            accessibility_score = _CATALOG_ACCESSIBILITY_SCORE

        metrics.append(
            LessonAnalyticsMetricResponse(
                lesson_id=lid,
                title=lesson.title,
                subject=subject.slug,
                grade_level=subject.grade_level,
                accessibility_score=accessibility_score,
                quiz_pass_rate=quiz_pass,
                status="active",
            )
        )

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


# ---------------------------------------------------------------------------
# Quiz generation — Quiz & Challenge Agent
# ---------------------------------------------------------------------------

from datetime import datetime, timezone
from pydantic import BaseModel as _PydanticBaseModel
from app.services.gemini_service import get_gemini_service
from app.schemas.lessons import QuizOption, QuizQuestion, QuizResponse


class _QuizGenerateRequest(_PydanticBaseModel):
    lesson_id: str
    quiz_context: dict | None = None
    misconception_tags: list[str] = []


def _build_mock_quiz(lesson_id: str, subject: str, grade_level: int, tags: list[str]) -> QuizResponse:
    """Deterministic fallback quiz when Gemini is unavailable."""
    tag_label = tags[0].replace("-", " ") if tags else "key concepts"
    return QuizResponse(
        quiz_id=f"quiz-{lesson_id}",
        lesson_id=lesson_id,
        questions=[
            QuizQuestion(
                question_id=f"{lesson_id}-q1",
                question_text=f"Which subject are you exploring in this Grade {grade_level} lesson?",
                options=[
                    QuizOption(option_id="a", option_text=subject, is_distractor=False),
                    QuizOption(option_id="b", option_text="Recess", is_distractor=True, misconception_type="attention-slip"),
                ],
                difficulty="easy",
            ),
            QuizQuestion(
                question_id=f"{lesson_id}-q2",
                question_text="What should you do if the puzzle feels tricky?",
                options=[
                    QuizOption(option_id="a", option_text="Look for patterns and keep trying", is_distractor=False),
                    QuizOption(option_id="b", option_text="Give up right away", is_distractor=True, misconception_type="confidence-drop"),
                ],
                difficulty="easy",
            ),
            QuizQuestion(
                question_id=f"{lesson_id}-q3",
                question_text=f"Which idea is most important when studying {tag_label}?",
                options=[
                    QuizOption(option_id="a", option_text="Understanding the steps carefully", is_distractor=False),
                    QuizOption(option_id="b", option_text="Memorising without thinking", is_distractor=True, misconception_type="rote-only"),
                    QuizOption(option_id="c", option_text="Skipping the hard parts", is_distractor=True, misconception_type="avoidance"),
                ],
                difficulty="medium",
            ),
        ],
        generated_at=datetime.now(timezone.utc).isoformat(),
    )


def _extract_json_array_from_llm_text(raw: str) -> str:
    """Pull JSON array or object from LLM output that may include markdown fences or preamble."""
    text = raw.strip()
    if "```" in text:
        for chunk in text.split("```"):
            chunk = chunk.strip()
            if chunk.lower().startswith("json"):
                chunk = chunk[4:].strip()
            if chunk.startswith(("[", "{")):
                text = chunk
                break
    text = text.strip()
    start = text.find("[")
    if start >= 0:
        depth = 0
        for i in range(start, len(text)):
            if text[i] == "[":
                depth += 1
            elif text[i] == "]":
                depth -= 1
                if depth == 0:
                    return text[start : i + 1]
    start = text.find("{")
    if start < 0:
        raise ValueError("No JSON object or array found in model output")
    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    raise ValueError("Unbalanced JSON braces in model output")


@router.post("/lessons/{lesson_id}/quiz", response_model=QuizResponse)
async def generate_quiz(
    lesson_id: str,
    db: Session = Depends(get_db),
):
    """
    Generate a quiz for a lesson.

    Uses GeminiService (Gemini API or local Ollama per LLM_PROVIDER) when a model
    is configured; falls back to deterministic mock questions if the call fails or
    the response is not valid quiz JSON.
    """
    entry = get_curriculum_lesson_entry(db, lesson_id)
    if entry is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found.")

    subject, _module, lesson = entry
    tags = list(lesson.tags or [])
    gemini = get_gemini_service()

    if gemini.model:
        prompt = f"""Generate 3 multiple-choice quiz questions for a Grade {subject.grade_level} {subject.name} lesson titled "{lesson.title}".

Misconception tags to probe: {', '.join(tags) if tags else 'general understanding'}

Return a JSON array of objects:
[{{"question_id":"q1","question_text":"...","options":[{{"option_id":"a","option_text":"...","is_distractor":false,"misconception_type":null}},{{"option_id":"b","option_text":"...","is_distractor":true,"misconception_type":"tag"}}],"difficulty":"easy|medium|hard"}}]

Return ONLY valid JSON — no markdown fences, no explanation before or after the array."""

        try:
            raw = await gemini._generate_content(prompt)
            clean = _extract_json_array_from_llm_text(raw)
            questions_data = json.loads(clean)
            if isinstance(questions_data, dict):
                questions_data = [questions_data]
            questions = [QuizQuestion.model_validate(q) for q in questions_data]
            return QuizResponse(
                quiz_id=f"quiz-{lesson_id}",
                lesson_id=lesson_id,
                questions=questions,
                generated_at=datetime.now(timezone.utc).isoformat(),
            )
        except Exception as exc:
            logger.warning(
                "Quiz LLM output unusable for lesson %s; using mock quiz. Reason: %s",
                lesson_id,
                exc,
            )

    return _build_mock_quiz(lesson_id, subject.name, subject.grade_level, tags)


# ---------------------------------------------------------------------------
# Event logging — replaces /mock/events
# ---------------------------------------------------------------------------


@router.post("/lessons/events")
def log_lesson_event(payload: dict, db: Session = Depends(get_db)):
    """Log a frontend lesson event (quiz_submit, etc.)."""
    raw_uid = payload.get("user_id")
    try:
        user_uuid = UUID(str(raw_uid)) if raw_uid else uuid4()
    except (ValueError, TypeError):
        user_uuid = uuid4()

    raw_sid = payload.get("session_id")
    try:
        session_uuid = UUID(str(raw_sid)) if raw_sid else uuid4()
    except (ValueError, TypeError):
        session_uuid = uuid4()

    try:
        db.add(
            UserEvent(
                user_id=user_uuid,
                session_id=session_uuid,
                event_type=str(payload.get("event", "unknown")),
                event_data=payload,
            )
        )
        db.commit()
    except Exception:
        db.rollback()
    return {"status": "ok"}