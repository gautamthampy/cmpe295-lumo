"""
Lesson endpoints — Gautam's component (Phase 2+3)
Handles lesson CRUD, MDX rendering, accessibility scoring, and sequencing.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import any_
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

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


# ---------------------------------------------------------------------------
# Preview — render arbitrary MDX without saving to the database
# ---------------------------------------------------------------------------

class PreviewRequest(BaseModel):
    content_mdx: str
    grade_level: int = 3


class PreviewResponse(BaseModel):
    html: str
    accessibility_score: float
    issues: list[dict]
    interactive_activities: list[dict] = []


@router.post("/preview", response_model=PreviewResponse)
async def preview_lesson(payload: PreviewRequest):
    """
    Render arbitrary MDX content to HTML and run the accessibility checker.
    Nothing is persisted — this is used by the MdxEditor live-preview panel.
    """
    renderer = get_renderer()
    html = renderer.render(payload.content_mdx)
    activities = renderer.extract_interactive_activities(payload.content_mdx)
    checker = get_checker()
    result = checker.check(html, grade_level=payload.grade_level)
    return PreviewResponse(
        html=html,
        accessibility_score=result.score,
        issues=[
            {"rule": i.rule, "severity": i.severity, "message": i.message}
            for i in result.issues
        ],
        interactive_activities=activities,
    )


import random

# ---------------------------------------------------------------------------
# Analytics summary — per-lesson metrics for the demo dashboard
# ---------------------------------------------------------------------------

@router.get("/analytics/summary")
async def get_analytics_summary(db: Session = Depends(get_db)):
    """
    Return per-lesson analytics metrics for the dashboard.
    Real event data would come from the analytics pipeline (Nivedita's agent);
    demo values are deterministically seeded from lesson metadata so they
    remain stable across page loads.
    """
    lessons = db.query(Lesson).filter(Lesson.status == "active").all()
    renderer = get_renderer()
    checker = get_checker()

    summary = []
    for lesson in lessons:
        html = renderer.render(lesson.content_mdx)
        result = checker.check(html, grade_level=lesson.grade_level)

        # Seed random from lesson UUID so metrics are stable across requests
        rng = random.Random(str(lesson.lesson_id))
        completion_rate = round(rng.uniform(0.60, 0.97), 2)
        avg_time_minutes = rng.randint(4, 18)
        quiz_pass_rate = round(rng.uniform(0.55, 0.95), 2)
        total_views = rng.randint(20, 200)

        summary.append({
            "lesson_id": str(lesson.lesson_id),
            "title": lesson.title,
            "subject": lesson.subject,
            "grade_level": lesson.grade_level,
            "accessibility_score": round(result.score, 2),
            "issues_count": len(result.issues),
            "completion_rate": completion_rate,
            "avg_time_minutes": avg_time_minutes,
            "quiz_pass_rate": quiz_pass_rate,
            "total_views": total_views,
            "misconception_tags": lesson.misconception_tags or [],
        })

    return {
        "total_lessons": len(summary),
        "avg_accessibility_score": round(
            sum(r["accessibility_score"] for r in summary) / len(summary), 2
        ) if summary else 0.0,
        "lessons": summary,
    }


@router.get("/accessibility-report")
async def get_accessibility_report(db: Session = Depends(get_db)):
    """
    Run the WCAG 2.1 AA checker on all published lessons and return a summary.
    Lessons scoring below 0.8 are flagged for review.
    """
    lessons = db.query(Lesson).filter(Lesson.status == "active").all()
    checker = get_checker()
    renderer = get_renderer()

    report = []
    for lesson in lessons:
        html = renderer.render(lesson.content_mdx)
        result = checker.check(html, grade_level=lesson.grade_level)
        report.append({
            "lesson_id": str(lesson.lesson_id),
            "title": lesson.title,
            "accessibility_score": result.score,
            "passed_rules": result.passed_rules,
            "total_rules": result.total_rules,
            "needs_review": result.score < 0.8,
            "issues": [
                {"rule": i.rule, "severity": i.severity, "message": i.message}
                for i in result.issues
            ],
        })

    avg_score = sum(r["accessibility_score"] for r in report) / len(report) if report else 0.0
    return {
        "total_lessons": len(report),
        "average_score": round(avg_score, 2),
        "lessons_needing_review": sum(1 for r in report if r["needs_review"]),
        "lessons": report,
    }


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
        prerequisites=payload.prerequisites,
        status="draft",
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return lesson


@router.post("/{lesson_id}/publish", response_model=LessonResponse)
async def publish_lesson(lesson_id: UUID, db: Session = Depends(get_db)):
    """
    Publish a lesson. Requires accessibility_score >= 0.8.
    Returns 400 if the lesson does not meet the quality bar.
    """
    lesson = db.query(Lesson).filter(Lesson.lesson_id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    if lesson.status == "active":
        raise HTTPException(status_code=400, detail="Lesson is already published.")

    renderer = get_renderer()
    html = renderer.render(lesson.content_mdx)
    checker = get_checker()
    result = checker.check(html, grade_level=lesson.grade_level)

    if result.score < 0.8:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Lesson accessibility score {result.score:.2f} is below the 0.80 threshold. "
                f"Fix {len(result.issues)} issue(s) before publishing."
            ),
        )

    lesson.status = "active"
    db.commit()
    db.refresh(lesson)
    return lesson


@router.post("/{lesson_id}/revise", response_model=LessonResponse, status_code=201)
async def revise_lesson(
    lesson_id: UUID,
    payload: LessonCreate,
    db: Session = Depends(get_db),
):
    """
    Create a new version of an existing lesson.
    The original lesson is preserved; the new revision references it via parent_version_id.
    """
    original = db.query(Lesson).filter(Lesson.lesson_id == lesson_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Lesson not found")

    revision = Lesson(
        title=payload.title,
        subject=payload.subject,
        grade_level=payload.grade_level,
        content_mdx=payload.content_mdx,
        misconception_tags=payload.misconception_tags,
        prerequisites=payload.prerequisites,
        status="draft",
        version=original.version + 1,
        parent_version_id=original.lesson_id,
    )
    db.add(revision)
    db.commit()
    db.refresh(revision)
    return revision


@router.get("/{lesson_id}/render", response_model=RenderedLessonResponse)
async def render_lesson(
    lesson_id: UUID,
    user_id: UUID = Query(...),
    mastery_score: Optional[float] = Query(None, ge=0.0, le=1.0),
    db: Session = Depends(get_db),
):
    """
    Render lesson content for display.

    Converts MDX to semantic HTML (adaptive by mastery_score if provided),
    computes a WCAG 2.1 AA accessibility score, and bundles quiz context
    and learning-path metadata for the Quiz Agent and frontend.

    Args:
        mastery_score: Optional 0.0-1.0 score from the Analytics Agent.
                       < 0.5 → scaffold mode (extra examples shown)
                       > 0.8 → advanced mode (review sections hidden)
    """
    lesson = db.query(Lesson).filter(Lesson.lesson_id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    # Convert MDX → HTML (adaptive if mastery_score supplied)
    renderer = get_renderer()
    if mastery_score is not None:
        html_content = renderer.render_adaptive(lesson.content_mdx, mastery_score)
    else:
        html_content = renderer.render(lesson.content_mdx)

    # Compute accessibility score (WCAG 2.1 AA rule-based)
    checker = get_checker()
    result = checker.check(html_content, grade_level=lesson.grade_level)

    # Estimated reading time (words / 150 wpm, minimum 1 minute)
    word_count = len(lesson.content_mdx.split())
    estimated_minutes = max(1, round(word_count / 150))

    # Learning path: find the next lesson (first lesson that lists this one as a prerequisite)
    next_lesson = (
        db.query(Lesson)
        .filter(Lesson.prerequisites.contains([lesson.lesson_id]))
        .first()
    )
    next_lesson_id = next_lesson.lesson_id if next_lesson else None

    # Prerequisites met: placeholder True until Nivedita's mastery endpoint is wired
    prerequisites_met = True

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

    activities = renderer.extract_interactive_activities(lesson.content_mdx)

    return RenderedLessonResponse(
        lesson_id=lesson.lesson_id,
        html_content=html_content,
        estimated_time_minutes=estimated_minutes,
        accessibility_score=result.score,
        accessibility_issues=issues,
        misconception_tags=lesson.misconception_tags or [],
        prerequisites=lesson.prerequisites or [],
        prerequisites_met=prerequisites_met,
        next_lesson_id=next_lesson_id,
        quiz_context=quiz_context,
        interactive_activities=activities,
    )
