"""
Lesson endpoints — Gautam's component (Phase 2)
Handles lesson CRUD, MDX rendering, and accessibility scoring.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from app.core.database import get_db
from app.models.lesson import Lesson
from app.schemas.lesson import (
    AccessibilityIssue,
    LessonCreate,
    LessonResponse,
    QuizContext,
    RenderedLessonResponse,
)
from app.services.mdx_renderer import get_renderer
from app.services.accessibility_checker import get_checker

router = APIRouter()


@router.get("/", response_model=list[LessonResponse])
async def get_lessons(
    subject: Optional[str] = Query(None),
    grade_level: Optional[int] = Query(None, ge=1, le=12),
    db: Session = Depends(get_db),
):
    """Get all lessons with optional subject/grade_level filters."""
    query = db.query(Lesson)
    if subject:
        query = query.filter(Lesson.subject == subject)
    if grade_level is not None:
        query = query.filter(Lesson.grade_level == grade_level)
    return query.order_by(Lesson.created_at.desc()).all()


@router.get("/{lesson_id}", response_model=LessonResponse)
async def get_lesson(lesson_id: UUID, db: Session = Depends(get_db)):
    """Get a specific lesson by ID."""
    lesson = db.query(Lesson).filter(Lesson.lesson_id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return lesson


@router.post("/", response_model=LessonResponse, status_code=201)
async def create_lesson(payload: LessonCreate, db: Session = Depends(get_db)):
    """Create a new lesson (status defaults to 'draft')."""
    lesson = Lesson(
        title=payload.title,
        subject=payload.subject,
        grade_level=payload.grade_level,
        content_mdx=payload.content_mdx,
        misconception_tags=payload.misconception_tags,
        status="draft",
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return lesson


@router.get("/{lesson_id}/render", response_model=RenderedLessonResponse)
async def render_lesson(
    lesson_id: UUID,
    user_id: UUID = Query(...),
    db: Session = Depends(get_db),
):
    """
    Render lesson content for display.

    Converts MDX to semantic HTML, computes a WCAG 2.1 AA accessibility
    score, and bundles quiz context for the Quiz Agent.
    """
    lesson = db.query(Lesson).filter(Lesson.lesson_id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    # Convert MDX → HTML
    renderer = get_renderer()
    html_content = renderer.render(lesson.content_mdx)

    # Compute accessibility score (WCAG 2.1 AA rule-based)
    checker = get_checker()
    result = checker.check(html_content, grade_level=lesson.grade_level)

    # Estimated reading time (words / 150 wpm, minimum 1 minute)
    word_count = len(lesson.content_mdx.split())
    estimated_minutes = max(1, round(word_count / 150))

    quiz_context = QuizContext(
        lesson_id=lesson.lesson_id,
        misconception_tags=lesson.misconception_tags or [],
        subject=lesson.subject,
        grade_level=lesson.grade_level,
    )

    issues = [
        AccessibilityIssue(rule=i.rule, severity=i.severity, message=i.message)
        for i in result.issues
    ]

    return RenderedLessonResponse(
        lesson_id=lesson.lesson_id,
        html_content=html_content,
        estimated_time_minutes=estimated_minutes,
        accessibility_score=result.score,
        accessibility_issues=issues,
        misconception_tags=lesson.misconception_tags or [],
        quiz_context=quiz_context,
    )
