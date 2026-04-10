from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.auth import AuthSession, EmailVerificationToken, ParentUser, PasswordResetToken, Student, StudentLoginCodeToken
from app.services.security import generate_numeric_code, generate_raw_token, hash_token

settings = get_settings()


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def normalize_email(email: str) -> str:
    return email.strip().lower()


def get_user_by_email(db: Session, email: str) -> ParentUser | None:
    return db.scalar(select(ParentUser).where(ParentUser.email == normalize_email(email)))


def issue_verification_token(db: Session, user: ParentUser) -> str:
    db.execute(
        delete(EmailVerificationToken).where(
            EmailVerificationToken.parent_user_id == user.id,
            EmailVerificationToken.used_at.is_(None),
        )
    )
    raw_token = generate_raw_token()
    db.add(
        EmailVerificationToken(
            parent_user_id=user.id,
            token_hash=hash_token(raw_token),
            expires_at=now_utc() + timedelta(hours=settings.verification_token_ttl_hours),
        )
    )
    return raw_token


def issue_password_reset_token(db: Session, user: ParentUser) -> str:
    db.execute(
        delete(PasswordResetToken).where(
            PasswordResetToken.parent_user_id == user.id,
            PasswordResetToken.used_at.is_(None),
        )
    )
    raw_token = generate_raw_token()
    db.add(
        PasswordResetToken(
            parent_user_id=user.id,
            token_hash=hash_token(raw_token),
            expires_at=now_utc() + timedelta(hours=settings.password_reset_token_ttl_hours),
        )
    )
    return raw_token


def issue_student_login_code(
    db: Session,
    user: ParentUser,
    *,
    origin: str,
    requested_ip: str | None,
    student: Student | None = None,
) -> tuple[str, datetime] | None:
    scope_filters = [
        StudentLoginCodeToken.parent_user_id == user.id,
        StudentLoginCodeToken.used_at.is_(None),
        StudentLoginCodeToken.request_origin == origin,
    ]
    if student is None:
        scope_filters.append(StudentLoginCodeToken.student_id.is_(None))
    else:
        scope_filters.append(StudentLoginCodeToken.student_id == student.student_id)

    recent = db.scalar(
        select(StudentLoginCodeToken)
        .where(
            *scope_filters,
            StudentLoginCodeToken.created_at
            > now_utc() - timedelta(seconds=settings.student_login_code_request_cooldown_seconds),
        )
        .order_by(StudentLoginCodeToken.created_at.desc())
    )
    if recent is not None:
        return None

    delete_filters = [
        StudentLoginCodeToken.parent_user_id == user.id,
        StudentLoginCodeToken.used_at.is_(None),
    ]
    if student is None:
        delete_filters.append(StudentLoginCodeToken.student_id.is_(None))
    else:
        delete_filters.append(StudentLoginCodeToken.student_id == student.student_id)

    db.execute(delete(StudentLoginCodeToken).where(*delete_filters))

    raw_code = generate_numeric_code(4)
    expires_at = now_utc() + timedelta(minutes=settings.student_login_code_ttl_minutes)
    db.add(
        StudentLoginCodeToken(
            parent_user_id=user.id,
            student_id=student.student_id if student else None,
            delivery_email=user.email,
            token_hash=hash_token(raw_code),
            request_origin=origin,
            requested_ip=requested_ip,
            expires_at=expires_at,
        )
    )
    return raw_code, expires_at


def consume_verification_token(db: Session, token: str) -> ParentUser | None:
    record = db.scalar(
        select(EmailVerificationToken)
        .where(
            EmailVerificationToken.token_hash == hash_token(token),
            EmailVerificationToken.used_at.is_(None),
            EmailVerificationToken.expires_at > now_utc(),
        )
    )
    if record is None:
        return None

    record.used_at = now_utc()
    record.parent_user.is_email_verified = True
    return record.parent_user


def consume_password_reset_token(db: Session, token: str) -> ParentUser | None:
    record = db.scalar(
        select(PasswordResetToken)
        .where(
            PasswordResetToken.token_hash == hash_token(token),
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > now_utc(),
        )
    )
    if record is None:
        return None

    record.used_at = now_utc()
    return record.parent_user


def consume_student_login_code(db: Session, code: str) -> StudentLoginCodeToken | None:
    record = db.scalar(
        select(StudentLoginCodeToken)
        .where(
            StudentLoginCodeToken.token_hash == hash_token(code),
            StudentLoginCodeToken.used_at.is_(None),
            StudentLoginCodeToken.expires_at > now_utc(),
        )
    )
    if record is None:
        return None

    record.used_at = now_utc()
    return record


def create_session(db: Session, user: ParentUser, remember_me: bool) -> tuple[str, datetime]:
    raw_token = generate_raw_token()
    expires_at = now_utc() + timedelta(days=settings.remember_me_session_ttl_days if remember_me else 0, hours=0 if remember_me else settings.session_ttl_hours)
    db.add(
        AuthSession(
            parent_user_id=user.id,
            token_hash=hash_token(raw_token),
            remember_me=remember_me,
            expires_at=expires_at,
        )
    )
    return raw_token, expires_at


def get_session(db: Session, raw_token: str) -> AuthSession | None:
    return db.scalar(
        select(AuthSession)
        .where(
            AuthSession.token_hash == hash_token(raw_token),
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > now_utc(),
        )
    )


def revoke_session(db: Session, raw_token: str) -> None:
    session = get_session(db, raw_token)
    if session is not None:
        session.revoked_at = now_utc()


def revoke_all_sessions_for_user(db: Session, user: ParentUser) -> None:
    for session in user.sessions:
        if session.revoked_at is None and ensure_utc(session.expires_at) > now_utc():
            session.revoked_at = now_utc()
