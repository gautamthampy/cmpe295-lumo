"""
AI-powered lesson generation endpoint — Gautam's component.

Uses a pluggable strategy pattern to generate lessons via:
  - zpd        : ZPD-based adaptive scaffolding (arXiv:2508.01503)
  - misconception: Misconception-driven confrontation (Springer 2025)
  - bkt        : Bayesian Knowledge Tracing gap targeting (arXiv:2509.23996)
  - hybrid     : Composite of all three (default)

Every generation call is logged to content.generation_runs for comparative evaluation.
"""
import hashlib
import logging
import time
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.lesson import Lesson
from app.models.subject import GenerationRun
from app.schemas.lesson import AccessibilityIssue, LessonResponse
from app.services.accessibility_checker import get_checker
from app.services.gemini_service import get_gemini_service
from app.services.generation.context_builder import GenerationContextBuilder
from app.services.generation.registry import StrategyName, get_strategy
from app.services.mdx_renderer import get_renderer
from app.services.subject_service import SubjectService

logger = logging.getLogger(__name__)
router = APIRouter()


class LessonGenerateRequest(BaseModel):
    topic: str = Field(..., min_length=3, max_length=200)
    grade_level: int = Field(default=3, ge=1, le=12)
    subject: str = Field(default="Mathematics", max_length=100)
    strategy: StrategyName = Field(
        default="hybrid",
        description="Generation strategy: zpd | misconception | bkt | hybrid",
    )
    save_as_draft: bool = Field(default=True)
    student_id: Optional[UUID] = Field(
        default=None,
        description="If provided, personalises content using the student's mastery profile",
    )


class LessonGenerateResponse(BaseModel):
    topic: str
    grade_level: int
    subject: str
    strategy: str
    difficulty_level: str
    generated_mdx: str
    html_preview: str
    accessibility_score: float
    accessibility_issues: list[AccessibilityIssue]
    misconception_tags: list[str]
    saved_lesson_id: Optional[str] = None
    run_id: Optional[str] = None
    gemini_used: bool


@router.post("/generate", response_model=LessonGenerateResponse)
async def generate_lesson(
    payload: LessonGenerateRequest,
    db: Session = Depends(get_db),
):
    """
    Generate a micro-lesson using the specified AI strategy.

    Strategies:
    - **hybrid** (default): Combines ZPD + BKT + Misconception signals
    - **zpd**: Calibrates difficulty to the student's Zone of Proximal Development
    - **misconception**: Targets detected misconceptions via Socratic confrontation
    - **bkt**: Bayesian Knowledge Tracing — focuses on weakest knowledge components

    Every call is logged to content.generation_runs for comparative evaluation.
    """
    gemini = get_gemini_service()
    subject_svc = SubjectService(db, gemini)

    # Resolve subject — creates it if it doesn't exist (subject-agnostic design)
    subject = subject_svc.get_or_create_subject(payload.subject)

    # Ensure taxonomy exists for this subject+grade (seeds if needed)
    await subject_svc.get_or_generate_taxonomy(subject, payload.grade_level)

    # Build generation context from DB
    builder = GenerationContextBuilder(db)
    ctx = await builder.build(
        topic=payload.topic,
        subject=subject,
        grade_level=payload.grade_level,
        student_id=payload.student_id,
    )

    # Generate via selected strategy
    strategy_instance = get_strategy(payload.strategy, gemini)
    t0 = time.time()
    result = await strategy_instance.generate(ctx)
    latency_ms = int((time.time() - t0) * 1000)

    gemini_used = gemini._client is not None

    # Render and validate accessibility
    renderer = get_renderer()
    html_preview = renderer.render(result.mdx_content)
    checker = get_checker()
    a11y = checker.check(html_preview, grade_level=payload.grade_level)

    if a11y.score < 0.3:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Generated content has very low accessibility score ({a11y.score:.2f}). "
                "Try a more specific topic description."
            ),
        )

    # Persist lesson as draft if requested
    saved_lesson_id: Optional[str] = None
    lesson_uuid: Optional[UUID] = None
    if payload.save_as_draft:
        lesson = Lesson(
            title=f"[AI/{result.strategy.upper()}] {payload.topic}",
            subject=payload.subject,
            grade_level=payload.grade_level,
            content_mdx=result.mdx_content,
            misconception_tags=result.misconception_tags,
            prerequisites=[],
            status="draft",
        )
        db.add(lesson)
        db.flush()
        lesson_uuid = lesson.lesson_id
        saved_lesson_id = str(lesson.lesson_id)

    # Log generation run for evaluation
    prompt_hash = hashlib.sha256(result.mdx_content.encode()).hexdigest()[:16]
    run = GenerationRun(
        lesson_id=lesson_uuid,
        strategy=result.strategy,
        topic=payload.topic,
        subject_id=subject.subject_id,
        grade_level=payload.grade_level,
        student_id=payload.student_id,
        prompt_hash=prompt_hash,
        llm_model=gemini.model,
        latency_ms=latency_ms,
        accessibility_score=a11y.score,
        eval_scores={},
    )
    db.add(run)
    db.commit()

    issues = [
        AccessibilityIssue(rule=i.rule, severity=i.severity, message=i.message)
        for i in a11y.issues
    ]

    return LessonGenerateResponse(
        topic=payload.topic,
        grade_level=payload.grade_level,
        subject=payload.subject,
        strategy=result.strategy,
        difficulty_level=result.difficulty_level,
        generated_mdx=result.mdx_content,
        html_preview=html_preview,
        accessibility_score=a11y.score,
        accessibility_issues=issues,
        misconception_tags=result.misconception_tags,
        saved_lesson_id=saved_lesson_id,
        run_id=str(run.run_id),
        gemini_used=gemini_used,
    )
