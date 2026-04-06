import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.models.auth import ParentUser, Student
from app.models.catalog import CurriculumLesson, CurriculumModule, CurriculumSubject
from app.schemas.auth import (
    CurriculumLessonResponse,
    CurriculumModuleResponse,
    CurriculumSubjectResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    GradeCurriculumCatalogResponse,
    MessageResponse,
    ParentDashboardResponse,
    ResendVerificationRequest,
    ResetPasswordRequest,
    SessionResponse,
    SignInRequest,
    SignInResponse,
    SignUpRequest,
    SignUpResponse,
    StudentSessionResponse,
    SubjectCatalogResponse,
    StudentAuthResponse,
    StudentCreateRequest,
    StudentLoginCodeIssueResponse,
    StudentLoginCodeRequest,
    StudentLoginCodeVerifyRequest,
    StudentSelectionRequest,
    StudentSummaryResponse,
    VerifyEmailRequest,
)
from app.services.auth import (
    consume_student_login_code,
    consume_password_reset_token,
    consume_verification_token,
    create_session,
    get_session,
    get_user_by_email,
    issue_student_login_code,
    issue_password_reset_token,
    issue_verification_token,
    normalize_email,
    revoke_all_sessions_for_user,
    revoke_session,
)
from app.services.auth_service import get_auth_service
from app.services.notifications import (
    EmailDeliveryError,
    send_password_reset_email,
    send_student_login_code_email,
    send_verification_email,
)
from app.services.catalog import get_grade_curriculum, list_curriculum_subjects
from app.services.security import hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])
logger = logging.getLogger(__name__)


def set_session_cookie(response: Response, settings: Settings, token: str, remember_me: bool) -> None:
    max_age = settings.remember_me_session_ttl_days * 24 * 60 * 60 if remember_me else settings.session_ttl_hours * 60 * 60
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        max_age=max_age,
        path="/",
    )


def clear_session_cookie(response: Response, settings: Settings) -> None:
    response.delete_cookie(key=settings.session_cookie_name, path="/")


def get_session_cookie(request: Request, settings: Settings) -> str | None:
    return request.cookies.get(settings.session_cookie_name)


def get_current_parent_user(request: Request, db: Session, settings: Settings) -> ParentUser:
    session_token = get_session_cookie(request, settings)
    if not session_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")

    session = get_session(db, session_token)
    if session is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")

    return session.parent_user


def serialize_student(student: Student) -> StudentSummaryResponse:
    return StudentSummaryResponse(
        student_id=student.student_id,
        display_name=student.display_name,
        grade_level=student.grade_level,
        avatar_id=student.avatar_id,
    )


def get_bearer_token(request: Request) -> str | None:
    authorization_header = request.headers.get("Authorization")
    if not authorization_header:
        return None

    scheme, _, token = authorization_header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None

    return token


def get_current_student_from_bearer_token(request: Request, db: Session) -> Student | None:
    token = get_bearer_token(request)
    if not token:
        return None

    auth = get_auth_service()
    try:
        token_payload = auth.decode_token(token)
    except JWTError:
        return None

    if token_payload.get("role") != "student":
        return None

    student_id = token_payload.get("sub")
    if not isinstance(student_id, str):
        return None

    return db.get(Student, student_id)


def build_student_auth_response(student: Student, settings: Settings) -> StudentAuthResponse:
    auth = get_auth_service()
    access_token = auth.create_student_token(
        student.student_id,
        student.parent_user_id,
        display_name=student.display_name,
        grade_level=student.grade_level,
    )
    return StudentAuthResponse(
        message=f"Signed in as {student.display_name}.",
        authenticated=True,
        access_token=access_token,
        expires_in=settings.student_token_expire_minutes * 60,
        student=serialize_student(student),
    )


def serialize_subject_catalog(subject: CurriculumSubject) -> SubjectCatalogResponse:
    return SubjectCatalogResponse(subject_id=subject.slug, name=subject.name, slug=subject.slug)


def serialize_curriculum_lesson(lesson: CurriculumLesson) -> CurriculumLessonResponse:
    return CurriculumLessonResponse(
        lesson_id=lesson.external_id,
        lesson_title=lesson.title,
        learning_objectives=lesson.learning_objectives,
        tags=list(lesson.tags or []),
    )


def serialize_curriculum_module(module: CurriculumModule) -> CurriculumModuleResponse:
    return CurriculumModuleResponse(
        module_id=module.external_id,
        module_title=module.title,
        semantic_description=module.semantic_description,
        lessons=[serialize_curriculum_lesson(lesson) for lesson in module.lessons],
    )


def serialize_curriculum_subject(subject: CurriculumSubject) -> CurriculumSubjectResponse:
    return CurriculumSubjectResponse(
        subject_slug=subject.slug,
        subject_name=subject.name,
        curriculum_provider=subject.curriculum_provider,
        modules=[serialize_curriculum_module(module) for module in subject.modules],
    )


@router.post("/sign-up", response_model=SignUpResponse, status_code=status.HTTP_201_CREATED)
def sign_up(payload: SignUpRequest, db: Session = Depends(get_db), settings: Settings = Depends(get_settings)) -> SignUpResponse:
    existing = get_user_by_email(db, payload.email)
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with that email already exists.")

    user = ParentUser(email=normalize_email(str(payload.email)), password_hash=hash_password(payload.password))
    db.add(user)
    db.flush()
    verification_token = issue_verification_token(db, user)

    try:
        send_verification_email(settings, user.email, verification_token)
    except EmailDeliveryError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Unable to send verification email right now.") from exc

    db.commit()

    return SignUpResponse(
        message="Account created. Check your email to verify your account.",
        verification_token=verification_token if settings.debug_auth_tokens else None,
    )


@router.post("/verify-email", response_model=MessageResponse)
def verify_email(payload: VerifyEmailRequest, db: Session = Depends(get_db)) -> MessageResponse:
    user = consume_verification_token(db, payload.token)
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This verification link is invalid or expired.")

    db.commit()
    return MessageResponse(message="Email verified. You can now sign in.")


@router.post("/resend-verification", response_model=SignUpResponse)
def resend_verification(
    payload: ResendVerificationRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> SignUpResponse:
    user = get_user_by_email(db, payload.email)
    verification_token: str | None = None

    if user is not None and not user.is_email_verified:
        verification_token = issue_verification_token(db, user)
        try:
            send_verification_email(settings, user.email, verification_token)
        except EmailDeliveryError as exc:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Unable to send verification email right now.") from exc
        db.commit()

    return SignUpResponse(
        message="If that account exists and is not yet verified, a new verification link has been sent.",
        verification_token=verification_token if settings.debug_auth_tokens else None,
    )


@router.post("/sign-in", response_model=SignInResponse)
def sign_in(
    payload: SignInRequest,
    response: Response,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> SignInResponse:
    user = get_user_by_email(db, payload.email)
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    if not user.is_email_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email verification required before sign-in.")

    raw_token, _ = create_session(db, user, payload.remember_me)
    db.commit()
    set_session_cookie(response, settings, raw_token, payload.remember_me)

    return SignInResponse(message="Signed in successfully.", email_verified=True, next_path="/portal")


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ForgotPasswordResponse:
    user = get_user_by_email(db, payload.email)
    reset_token: str | None = None

    if user is not None:
        reset_token = issue_password_reset_token(db, user)
        try:
            send_password_reset_email(settings, user.email, reset_token)
        except EmailDeliveryError:
            db.rollback()
            logger.warning("Password reset email delivery failed for %s.", user.email)
            reset_token = None
        else:
            db.commit()

    return ForgotPasswordResponse(
        message="If an account exists for that email, a password reset link is on the way.",
        reset_token=reset_token if settings.debug_auth_tokens else None,
    )


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> MessageResponse:
    user = consume_password_reset_token(db, payload.token)
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This reset link is invalid or expired.")

    user.password_hash = hash_password(payload.password)
    revoke_all_sessions_for_user(db, user)
    db.commit()
    return MessageResponse(message="Password updated. Sign in with your new password.")


@router.post("/logout", response_model=MessageResponse)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> MessageResponse:
    session_token = get_session_cookie(request, settings)
    if session_token:
        revoke_session(db, session_token)
        db.commit()

    clear_session_cookie(response, settings)
    return MessageResponse(message="Signed out.")


@router.get("/session", response_model=SessionResponse)
def read_session(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> SessionResponse:
    session_token = get_session_cookie(request, settings)
    if not session_token:
        return SessionResponse(authenticated=False, email_verified=False)

    session = get_session(db, session_token)
    if session is None:
        return SessionResponse(authenticated=False, email_verified=False)

    return SessionResponse(
        authenticated=True,
        email_verified=session.parent_user.is_email_verified,
        email=session.parent_user.email,
    )


@router.get("/student-session", response_model=StudentSessionResponse)
def read_student_session(
    request: Request,
    db: Session = Depends(get_db),
) -> StudentSessionResponse:
    student = get_current_student_from_bearer_token(request, db)
    if student is None:
        return StudentSessionResponse(authenticated=False)

    return StudentSessionResponse(authenticated=True, student=serialize_student(student))


@router.get("/me", response_model=ParentDashboardResponse)
def read_parent_dashboard(
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ParentDashboardResponse:
    parent_user = get_current_parent_user(request, db, settings)
    students = [serialize_student(student) for student in sorted(parent_user.students, key=lambda item: item.created_at)]
    return ParentDashboardResponse(parent_id=parent_user.id, email=parent_user.email, students=students)


@router.get("/subjects", response_model=list[SubjectCatalogResponse])
def list_subject_catalog(
    grade_level: int | None = Query(default=None, ge=1, le=12),
    db: Session = Depends(get_db),
) -> list[SubjectCatalogResponse]:
    subjects = list_curriculum_subjects(db, grade_level)
    return [serialize_subject_catalog(subject) for subject in subjects]


@router.get("/catalog", response_model=GradeCurriculumCatalogResponse)
def read_grade_curriculum_catalog(
    grade_level: int = Query(..., ge=1, le=12),
    db: Session = Depends(get_db),
) -> GradeCurriculumCatalogResponse:
    subjects = get_grade_curriculum(db, grade_level)
    if not subjects:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No curriculum catalog is available for that grade level yet.")

    return GradeCurriculumCatalogResponse(
        grade_level=grade_level,
        subjects=[serialize_curriculum_subject(subject) for subject in subjects],
    )


@router.post("/students", response_model=StudentSummaryResponse, status_code=status.HTTP_201_CREATED)
def create_student_profile(
    payload: StudentCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> StudentSummaryResponse:
    parent_user = get_current_parent_user(request, db, settings)
    student = Student(
        parent_user_id=parent_user.id,
        display_name=payload.display_name.strip(),
        grade_level=payload.grade_level,
        avatar_id=payload.avatar_id,
        consent_given=payload.consent_given,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return serialize_student(student)


@router.post("/student-login/request-code", response_model=StudentLoginCodeIssueResponse)
def request_student_login_code(
    payload: StudentLoginCodeRequest,
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> StudentLoginCodeIssueResponse:
    parent_user = get_user_by_email(db, payload.email)
    login_code: str | None = None

    if parent_user is not None and parent_user.is_email_verified and parent_user.students:
        issued = issue_student_login_code(
            db,
            parent_user,
            origin="student_login",
            requested_ip=request.client.host if request.client else None,
        )
        if issued is not None:
            login_code, _ = issued
            try:
                send_student_login_code_email(
                    settings,
                    parent_user.email,
                    login_code,
                    expires_in_minutes=settings.student_login_code_ttl_minutes,
                )
            except EmailDeliveryError:
                db.rollback()
                logger.warning("Student login code email delivery failed for %s.", parent_user.email)
                login_code = None
            else:
                db.commit()

    return StudentLoginCodeIssueResponse(
        message="If that family account is available, a student sign-in code is on the way.",
        login_code=login_code if settings.debug_auth_tokens else None,
        expires_in=settings.student_login_code_ttl_minutes * 60,
    )


@router.post("/student-login/verify-code", response_model=StudentAuthResponse)
def verify_student_login_code(
    payload: StudentLoginCodeVerifyRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> StudentAuthResponse:
    record = consume_student_login_code(db, payload.code)
    if record is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This student login code is invalid or expired.")

    parent_user = record.parent_user
    if record.student is not None:
        response = build_student_auth_response(record.student, settings)
        db.commit()
        return response

    students = sorted(parent_user.students, key=lambda item: item.created_at)
    if not students:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No student profiles are available for this family.")

    if len(students) == 1:
        response = build_student_auth_response(students[0], settings)
        db.commit()
        return response

    auth = get_auth_service()
    selection_token = auth.create_student_selection_token(parent_user.id)
    db.commit()
    return StudentAuthResponse(
        message="Choose who is learning today.",
        requires_student_selection=True,
        selection_token=selection_token,
        students=[serialize_student(student) for student in students],
    )


@router.post("/student-login/select-student", response_model=StudentAuthResponse)
def select_student_after_code(
    payload: StudentSelectionRequest,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> StudentAuthResponse:
    auth = get_auth_service()
    try:
        token_payload = auth.decode_token(payload.selection_token)
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Selection token is invalid or expired.") from exc

    if token_payload.get("role") != "student-selection":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Selection token is invalid or expired.")

    parent_user = db.get(ParentUser, token_payload.get("sub"))
    if parent_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent account not found.")

    student = db.get(Student, payload.student_id)
    if student is None or student.parent_user_id != parent_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    return build_student_auth_response(student, settings)


@router.post("/students/{student_id}/login-code", response_model=StudentLoginCodeIssueResponse)
def generate_student_login_code(
    student_id: str,
    request: Request,
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> StudentLoginCodeIssueResponse:
    parent_user = get_current_parent_user(request, db, settings)
    student = db.get(Student, student_id)
    if student is None or student.parent_user_id != parent_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    issued = issue_student_login_code(
        db,
        parent_user,
        origin="parent_portal",
        requested_ip=request.client.host if request.client else None,
        student=student,
    )
    if issued is None:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="A student login code was generated recently. Please wait before requesting another one.")

    login_code, _ = issued

    try:
        send_student_login_code_email(
            settings,
            parent_user.email,
            login_code,
            expires_in_minutes=settings.student_login_code_ttl_minutes,
            student_name=student.display_name,
        )
    except EmailDeliveryError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Unable to send the student login code email right now.") from exc

    db.commit()
    logger.info("Generated a short-lived student login code for student_id=%s via parent portal.", student.student_id)
    return StudentLoginCodeIssueResponse(
        message=f"A new code was generated for {student.display_name} and sent to {parent_user.email}.",
        login_code=login_code,
        expires_in=settings.student_login_code_ttl_minutes * 60,
    )
