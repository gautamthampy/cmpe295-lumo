"""Auth endpoints — parent registration/login and student profile management."""
import logging
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_parent
from app.models.auth import Parent, Student
from app.models.subject import StudentSubject, Subject
from app.schemas.auth import (
    ParentLogin,
    ParentRegister,
    ParentResponse,
    StudentCreate,
    StudentLogin,
    StudentResponse,
    StudentUpdate,
    SubjectEnroll,
    SubjectResponse,
    TokenResponse,
)
from app.services.auth_service import get_auth_service
from app.core.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter()


# ------------------------------------------------------------------
# Parent endpoints
# ------------------------------------------------------------------

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register_parent(payload: ParentRegister, db: Session = Depends(get_db)):
    """Register a new parent account."""
    existing = db.query(Parent).filter(Parent.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )
    auth = get_auth_service()
    parent = Parent(
        email=payload.email,
        password_hash=auth.hash_password(payload.password),
        display_name=payload.display_name,
    )
    db.add(parent)
    db.commit()
    db.refresh(parent)

    token = auth.create_parent_token(parent.parent_id)
    settings = get_settings()
    return TokenResponse(
        access_token=token,
        role="parent",
        expires_in=settings.JWT_EXPIRE_MINUTES * 60,
    )


@router.post("/login", response_model=TokenResponse)
async def login_parent(payload: ParentLogin, db: Session = Depends(get_db)):
    """Parent email + password login."""
    parent = db.query(Parent).filter(Parent.email == payload.email).first()
    auth = get_auth_service()
    if not parent or not auth.verify_password(payload.password, parent.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    parent.last_login = datetime.now(timezone.utc)
    db.commit()

    token = auth.create_parent_token(parent.parent_id)
    settings = get_settings()
    return TokenResponse(
        access_token=token,
        role="parent",
        expires_in=settings.JWT_EXPIRE_MINUTES * 60,
    )


@router.get("/me", response_model=ParentResponse)
async def get_me(
    parent: Parent = Depends(get_current_parent),
    db: Session = Depends(get_db),
):
    """Return the logged-in parent's profile including all student profiles."""
    students_out = []
    for student in parent.students:
        enrolled = (
            db.query(StudentSubject)
            .filter(StudentSubject.student_id == student.student_id)
            .all()
        )
        subjects = [
            SubjectResponse(
                subject_id=ss.subject.subject_id,
                name=ss.subject.name,
                slug=ss.subject.slug,
            )
            for ss in enrolled
            if ss.subject
        ]
        students_out.append(
            StudentResponse(
                student_id=student.student_id,
                display_name=student.display_name,
                grade_level=student.grade_level,
                avatar_id=student.avatar_id,
                consent_given=student.consent_given,
                subjects=subjects,
            )
        )
    return ParentResponse(
        parent_id=parent.parent_id,
        email=parent.email,
        display_name=parent.display_name,
        students=students_out,
    )


# ------------------------------------------------------------------
# Student endpoints
# ------------------------------------------------------------------

@router.post("/students", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    payload: StudentCreate,
    parent: Parent = Depends(get_current_parent),
    db: Session = Depends(get_db),
):
    """Create a child profile under the logged-in parent."""
    auth = get_auth_service()
    student = Student(
        parent_id=parent.parent_id,
        display_name=payload.display_name,
        grade_level=payload.grade_level,
        pin_hash=auth.hash_pin(payload.pin),
        avatar_id=payload.avatar_id,
        consent_given=payload.consent_given,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return StudentResponse(
        student_id=student.student_id,
        display_name=student.display_name,
        grade_level=student.grade_level,
        avatar_id=student.avatar_id,
        consent_given=student.consent_given,
        subjects=[],
    )


@router.post("/students/{student_id}/login", response_model=TokenResponse)
async def login_student(
    student_id: UUID,
    payload: StudentLogin,
    db: Session = Depends(get_db),
):
    """Student PIN login. Returns a short-lived student-scoped token."""
    student = db.query(Student).filter(Student.student_id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    auth = get_auth_service()
    if not student.pin_hash or not auth.verify_pin(payload.pin, student.pin_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect PIN"
        )
    token = auth.create_student_token(student.student_id, student.parent_id)
    settings = get_settings()
    return TokenResponse(
        access_token=token,
        role="student",
        expires_in=settings.STUDENT_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.put("/students/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: UUID,
    payload: StudentUpdate,
    parent: Parent = Depends(get_current_parent),
    db: Session = Depends(get_db),
):
    """Update a student profile (parent only, must own the student)."""
    student = db.query(Student).filter(
        Student.student_id == student_id,
        Student.parent_id == parent.parent_id,
    ).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    auth = get_auth_service()
    if payload.display_name is not None:
        student.display_name = payload.display_name
    if payload.grade_level is not None:
        student.grade_level = payload.grade_level
    if payload.pin is not None:
        student.pin_hash = auth.hash_pin(payload.pin)
    if payload.avatar_id is not None:
        student.avatar_id = payload.avatar_id
    if payload.consent_given is not None:
        student.consent_given = payload.consent_given

    db.commit()
    db.refresh(student)

    enrolled = (
        db.query(StudentSubject)
        .filter(StudentSubject.student_id == student.student_id)
        .all()
    )
    subjects = [
        SubjectResponse(
            subject_id=ss.subject.subject_id,
            name=ss.subject.name,
            slug=ss.subject.slug,
        )
        for ss in enrolled
        if ss.subject
    ]
    return StudentResponse(
        student_id=student.student_id,
        display_name=student.display_name,
        grade_level=student.grade_level,
        avatar_id=student.avatar_id,
        consent_given=student.consent_given,
        subjects=subjects,
    )


@router.post("/students/{student_id}/subjects", response_model=SubjectResponse)
async def enroll_subject(
    student_id: UUID,
    payload: SubjectEnroll,
    parent: Parent = Depends(get_current_parent),
    db: Session = Depends(get_db),
):
    """Enroll a student in a subject (parent only)."""
    student = db.query(Student).filter(
        Student.student_id == student_id,
        Student.parent_id == parent.parent_id,
    ).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    subject = db.query(Subject).filter(Subject.subject_id == payload.subject_id).first()
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found")

    existing = db.query(StudentSubject).filter(
        StudentSubject.student_id == student_id,
        StudentSubject.subject_id == payload.subject_id,
    ).first()
    if existing:
        return SubjectResponse(
            subject_id=subject.subject_id, name=subject.name, slug=subject.slug
        )

    enrollment = StudentSubject(student_id=student_id, subject_id=payload.subject_id)
    db.add(enrollment)
    db.commit()
    return SubjectResponse(subject_id=subject.subject_id, name=subject.name, slug=subject.slug)


@router.delete("/students/{student_id}/subjects/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unenroll_subject(
    student_id: UUID,
    subject_id: UUID,
    parent: Parent = Depends(get_current_parent),
    db: Session = Depends(get_db),
):
    """Remove a subject enrollment."""
    student = db.query(Student).filter(
        Student.student_id == student_id,
        Student.parent_id == parent.parent_id,
    ).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    enrollment = db.query(StudentSubject).filter(
        StudentSubject.student_id == student_id,
        StudentSubject.subject_id == subject_id,
    ).first()
    if enrollment:
        db.delete(enrollment)
        db.commit()


@router.get("/subjects", response_model=list[SubjectResponse])
async def list_subjects(db: Session = Depends(get_db)):
    """Return all available subjects (public — used during onboarding)."""
    subjects = db.query(Subject).order_by(Subject.name).all()
    return [
        SubjectResponse(subject_id=s.subject_id, name=s.name, slug=s.slug)
        for s in subjects
    ]


@router.get("/students/{student_id}", response_model=StudentResponse)
async def get_student(
    student_id: UUID,
    parent: Parent = Depends(get_current_parent),
    db: Session = Depends(get_db),
):
    """Get a single student profile (parent only)."""
    student = db.query(Student).filter(
        Student.student_id == student_id,
        Student.parent_id == parent.parent_id,
    ).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    enrolled = (
        db.query(StudentSubject)
        .filter(StudentSubject.student_id == student.student_id)
        .all()
    )
    subjects = [
        SubjectResponse(
            subject_id=ss.subject.subject_id,
            name=ss.subject.name,
            slug=ss.subject.slug,
        )
        for ss in enrolled
        if ss.subject
    ]
    return StudentResponse(
        student_id=student.student_id,
        display_name=student.display_name,
        grade_level=student.grade_level,
        avatar_id=student.avatar_id,
        consent_given=student.consent_given,
        subjects=subjects,
    )
