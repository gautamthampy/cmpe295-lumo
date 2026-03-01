"""
AI-powered lesson generation endpoint — Gautam's component (Phase 3).
Calls Gemini to generate lesson MDX, validates accessibility, and returns a draft lesson.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.database import get_db
from app.models.lesson import Lesson
from app.schemas.lesson import LessonResponse, AccessibilityIssue
from app.services.gemini_service import get_gemini_service
from app.services.mdx_renderer import get_renderer
from app.services.accessibility_checker import get_checker

router = APIRouter()


class LessonGenerateRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=200, description="The topic to generate a lesson for")
    grade_level: int = Field(default=3, ge=1, le=12)
    subject: str = Field(default="Mathematics", max_length=100)
    save_as_draft: bool = Field(
        default=True,
        description="If true, persist the generated lesson as a draft in the database",
    )


class LessonGenerateResponse(BaseModel):
    topic: str
    grade_level: int
    subject: str
    generated_mdx: str
    html_preview: str
    accessibility_score: float
    accessibility_issues: list[AccessibilityIssue]
    saved_lesson_id: str | None = None
    gemini_used: bool


@router.post("/generate", response_model=LessonGenerateResponse)
async def generate_lesson(
    payload: LessonGenerateRequest,
    db: Session = Depends(get_db),
):
    """
    Generate a micro-lesson using Gemini AI.

    - Sends a structured prompt to Gemini requesting MDX-formatted lesson content.
    - Renders the MDX to HTML and runs the WCAG 2.1 AA accessibility checker.
    - Optionally saves the generated lesson as a draft in the database.

    If GEMINI_API_KEY is not set, returns a stub lesson template so the endpoint
    remains functional for demos without an API key.
    """
    settings = get_settings()
    gemini = get_gemini_service(api_key=settings.gemini_api_key or "")

    # Generate MDX content
    mdx_content = await gemini.generate_lesson_content(
        topic=payload.topic,
        grade_level=payload.grade_level,
        subject=payload.subject,
    )
    gemini_used = bool(settings.gemini_api_key and gemini._client is not None)

    # Validate content accessibility
    renderer = get_renderer()
    html_preview = renderer.render(mdx_content)

    checker = get_checker()
    result = checker.check(html_preview, grade_level=payload.grade_level)

    # Reject if extremely poor quality (score < 0.3 indicates broken structure)
    if result.score < 0.3:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Generated content has very low accessibility score ({result.score:.2f}). "
                "Try a more specific topic description."
            ),
        )

    # Persist as draft if requested
    saved_lesson_id = None
    if payload.save_as_draft:
        lesson = Lesson(
            title=f"[AI] {payload.topic}",
            subject=payload.subject,
            grade_level=payload.grade_level,
            content_mdx=mdx_content,
            misconception_tags=[],
            prerequisites=[],
            status="draft",
        )
        db.add(lesson)
        db.commit()
        db.refresh(lesson)
        saved_lesson_id = str(lesson.lesson_id)

    issues = [
        AccessibilityIssue(rule=i.rule, severity=i.severity, message=i.message)
        for i in result.issues
    ]

    return LessonGenerateResponse(
        topic=payload.topic,
        grade_level=payload.grade_level,
        subject=payload.subject,
        generated_mdx=mdx_content,
        html_preview=html_preview,
        accessibility_score=result.score,
        accessibility_issues=issues,
        saved_lesson_id=saved_lesson_id,
        gemini_used=gemini_used,
    )
