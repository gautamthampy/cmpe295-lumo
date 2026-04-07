"""Diagnostic assessment endpoints."""
import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_parent, get_current_student
from app.models.auth import Parent, Student
from app.models.subject import DiagnosticAssessment, Subject
from app.services.diagnostic_service import DiagnosticService
from app.services.gemini_service import get_gemini_service
from app.services.subject_service import SubjectService

logger = logging.getLogger(__name__)
router = APIRouter()


class DiagnosticGenerateRequest(BaseModel):
    student_id: UUID
    subject_id: UUID
    topic_id: Optional[UUID] = None


class ActivityResponse(BaseModel):
    activity_id: str
    answer: str


class DiagnosticSubmitRequest(BaseModel):
    responses: list[ActivityResponse]


class DiagnosticResponse(BaseModel):
    assessment_id: UUID
    status: str
    subject_id: UUID
    student_id: Optional[UUID]
    activities: list[dict]
    weak_tags: list[str]
    results: Optional[list[dict]] = None
    created_at: str
    completed_at: Optional[str] = None


class DiagnosticResultResponse(BaseModel):
    assessment_id: UUID
    weak_tags: list[str]
    suggested_lessons: list[dict]
    results: list[dict]


def _to_response(assessment: DiagnosticAssessment) -> DiagnosticResponse:
    return DiagnosticResponse(
        assessment_id=assessment.assessment_id,
        status=assessment.status,
        subject_id=assessment.subject_id,
        student_id=assessment.student_id,
        activities=assessment.activities or [],
        weak_tags=assessment.weak_tags or [],
        results=assessment.results,
        created_at=assessment.created_at.isoformat(),
        completed_at=assessment.completed_at.isoformat() if assessment.completed_at else None,
    )


@router.post("/generate", response_model=DiagnosticResponse, status_code=status.HTTP_201_CREATED)
async def generate_diagnostic(
    payload: DiagnosticGenerateRequest,
    parent: Parent = Depends(get_current_parent),
    db: Session = Depends(get_db),
):
    """Parent requests a diagnostic assessment for one of their students."""
    # Verify parent owns this student
    student = next(
        (s for s in parent.students if s.student_id == payload.student_id), None
    )
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    subject = db.query(Subject).filter(Subject.subject_id == payload.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    gemini = get_gemini_service()
    subject_svc = SubjectService(db, gemini)
    svc = DiagnosticService(db, gemini, subject_svc)

    assessment = await svc.generate_diagnostic(
        subject=subject,
        grade_level=student.grade_level,
        student_id=student.student_id,
        topic_id=payload.topic_id,
        requested_by="parent",
    )
    return _to_response(assessment)


@router.get("/{assessment_id}", response_model=DiagnosticResponse)
async def get_diagnostic(
    assessment_id: UUID,
    db: Session = Depends(get_db),
):
    """Fetch a diagnostic assessment (public — student uses a shared link)."""
    assessment = (
        db.query(DiagnosticAssessment)
        .filter(DiagnosticAssessment.assessment_id == assessment_id)
        .first()
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return _to_response(assessment)


@router.post("/{assessment_id}/submit", response_model=DiagnosticResultResponse)
async def submit_diagnostic(
    assessment_id: UUID,
    payload: DiagnosticSubmitRequest,
    db: Session = Depends(get_db),
):
    """
    Student submits diagnostic responses.
    Returns weak_tags and suggested/generated lessons.
    """
    assessment = (
        db.query(DiagnosticAssessment)
        .filter(DiagnosticAssessment.assessment_id == assessment_id)
        .first()
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if assessment.status == "completed":
        raise HTTPException(status_code=409, detail="Assessment already completed")

    gemini = get_gemini_service()
    subject_svc = SubjectService(db, gemini)
    svc = DiagnosticService(db, gemini, subject_svc)

    responses = [
        {"activity_id": r.activity_id, "answer": r.answer} for r in payload.responses
    ]
    assessment = svc.score_diagnostic(assessment_id, responses)
    suggested = await svc.suggest_lessons(assessment)

    return DiagnosticResultResponse(
        assessment_id=assessment.assessment_id,
        weak_tags=assessment.weak_tags or [],
        suggested_lessons=suggested,
        results=assessment.results or [],
    )


@router.get("/results/{student_id}", response_model=list[DiagnosticResponse])
async def get_student_diagnostics(
    student_id: UUID,
    parent: Parent = Depends(get_current_parent),
    db: Session = Depends(get_db),
):
    """Parent views all diagnostic results for one of their students."""
    student = next(
        (s for s in parent.students if s.student_id == student_id), None
    )
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    assessments = (
        db.query(DiagnosticAssessment)
        .filter(DiagnosticAssessment.student_id == student_id)
        .order_by(DiagnosticAssessment.created_at.desc())
        .all()
    )
    return [_to_response(a) for a in assessments]
