from __future__ import annotations

from datetime import timedelta

from sqlalchemy import select

from app.models.auth import AuthSession, EmailVerificationToken, ParentUser, PasswordResetToken, Student, StudentLoginCodeToken
from app.services.auth import (
    consume_password_reset_token,
    consume_student_login_code,
    consume_verification_token,
    create_session,
    ensure_utc,
    issue_student_login_code,
    issue_password_reset_token,
    issue_verification_token,
    normalize_email,
    revoke_session,
    settings,
)
from app.services.security import hash_password


def create_parent(db_session, email: str = "parent@example.com") -> ParentUser:
    parent = ParentUser(email=normalize_email(email), password_hash=hash_password("Password123"))
    db_session.add(parent)
    db_session.commit()
    db_session.refresh(parent)
    return parent


def create_student(db_session, parent: ParentUser, display_name: str = "Alex", grade_level: int = 3) -> Student:
    student = Student(
        parent_user_id=parent.id,
        display_name=display_name,
        grade_level=grade_level,
        avatar_id="owl",
        consent_given=True,
    )
    db_session.add(student)
    db_session.commit()
    db_session.refresh(student)
    return student


def test_parent_user_creation_persists_across_sessions(db_session, db_session_factory):
    created = create_parent(db_session, email="persist@example.com")

    verification = issue_verification_token(db_session, created)
    reset = issue_password_reset_token(db_session, created)
    session_token, _ = create_session(db_session, created, remember_me=False)
    db_session.commit()

    other_session = db_session_factory()
    try:
        stored_parent = other_session.scalar(select(ParentUser).where(ParentUser.id == created.id))
        stored_verification = other_session.scalar(select(EmailVerificationToken).where(EmailVerificationToken.parent_user_id == created.id))
        stored_reset = other_session.scalar(select(PasswordResetToken).where(PasswordResetToken.parent_user_id == created.id))
        stored_session = other_session.scalar(select(AuthSession).where(AuthSession.parent_user_id == created.id))

        assert stored_parent is not None
        assert stored_parent.email == "persist@example.com"
        assert stored_verification is not None
        assert stored_reset is not None
        assert stored_session is not None
        assert verification != reset
        assert session_token
    finally:
        other_session.close()


def test_rollback_discards_uncommitted_parent_user(db_session):
    parent = ParentUser(email="rollback@example.com", password_hash=hash_password("Password123"))
    db_session.add(parent)

    db_session.rollback()

    stored_parent = db_session.scalar(select(ParentUser).where(ParentUser.email == "rollback@example.com"))
    assert stored_parent is None


def test_parent_user_update_persists_after_commit(db_session, db_session_factory):
    parent = create_parent(db_session, email="update@example.com")
    original_updated_at = parent.updated_at

    parent.is_email_verified = True
    db_session.commit()

    other_session = db_session_factory()
    try:
        stored_parent = other_session.scalar(select(ParentUser).where(ParentUser.id == parent.id))
        assert stored_parent is not None
        assert stored_parent.is_email_verified is True
        assert stored_parent.updated_at >= original_updated_at
    finally:
        other_session.close()


def test_verification_and_reset_token_lifecycle_save_modify_and_replace(db_session):
    parent = create_parent(db_session, email="tokens@example.com")

    original_verification_token = issue_verification_token(db_session, parent)
    original_reset_token = issue_password_reset_token(db_session, parent)
    db_session.commit()

    replaced_verification_token = issue_verification_token(db_session, parent)
    replaced_reset_token = issue_password_reset_token(db_session, parent)
    db_session.commit()

    verification_rows = db_session.scalars(
        select(EmailVerificationToken).where(EmailVerificationToken.parent_user_id == parent.id)
    ).all()
    reset_rows = db_session.scalars(
        select(PasswordResetToken).where(PasswordResetToken.parent_user_id == parent.id)
    ).all()

    assert original_verification_token != replaced_verification_token
    assert original_reset_token != replaced_reset_token
    assert len(verification_rows) == 1
    assert len(reset_rows) == 1

    verified_parent = consume_verification_token(db_session, replaced_verification_token)
    reset_parent = consume_password_reset_token(db_session, replaced_reset_token)
    db_session.commit()

    stored_verification = db_session.scalar(select(EmailVerificationToken).where(EmailVerificationToken.parent_user_id == parent.id))
    stored_reset = db_session.scalar(select(PasswordResetToken).where(PasswordResetToken.parent_user_id == parent.id))

    assert verified_parent is not None
    assert reset_parent is not None
    assert stored_verification.used_at is not None
    assert stored_reset.used_at is not None


def test_session_creation_and_revocation_persist(db_session, db_session_factory):
    parent = create_parent(db_session, email="sessiondb@example.com")

    raw_token, expires_at = create_session(db_session, parent, remember_me=True)
    db_session.commit()
    revoke_session(db_session, raw_token)
    db_session.commit()

    other_session = db_session_factory()
    try:
        stored_session = other_session.scalar(select(AuthSession).where(AuthSession.parent_user_id == parent.id))
        assert stored_session is not None
        assert stored_session.remember_me is True
        assert ensure_utc(stored_session.expires_at) >= expires_at - timedelta(seconds=1)
        assert stored_session.revoked_at is not None
    finally:
        other_session.close()


def test_deleting_parent_cascades_to_sessions_and_tokens(db_session):
    parent = create_parent(db_session, email="cascade@example.com")
    issue_verification_token(db_session, parent)
    issue_password_reset_token(db_session, parent)
    create_session(db_session, parent, remember_me=False)
    db_session.commit()

    db_session.delete(parent)
    db_session.commit()

    assert db_session.scalar(select(ParentUser).where(ParentUser.email == "cascade@example.com")) is None
    assert db_session.scalar(select(AuthSession).where(AuthSession.parent_user_id == parent.id)) is None
    assert db_session.scalar(select(EmailVerificationToken).where(EmailVerificationToken.parent_user_id == parent.id)) is None
    assert db_session.scalar(select(PasswordResetToken).where(PasswordResetToken.parent_user_id == parent.id)) is None


def test_student_login_code_is_hashed_and_consumed_once(db_session):
    parent = create_parent(db_session, email="studentcode@example.com")
    student = create_student(db_session, parent)

    issued = issue_student_login_code(
        db_session,
        parent,
        origin="parent_portal",
        requested_ip="127.0.0.1",
        student=student,
    )
    assert issued is not None
    raw_code, expires_at = issued
    db_session.commit()

    stored_code = db_session.scalar(select(StudentLoginCodeToken).where(StudentLoginCodeToken.parent_user_id == parent.id))

    assert stored_code is not None
    assert stored_code.token_hash != raw_code
    assert stored_code.student_id == student.student_id
    assert stored_code.delivery_email == parent.email
    assert ensure_utc(stored_code.expires_at) >= expires_at - timedelta(seconds=1)

    consumed = consume_student_login_code(db_session, raw_code)
    db_session.commit()
    reused = consume_student_login_code(db_session, raw_code)

    assert consumed is not None
    assert consumed.used_at is not None
    assert reused is None


def test_student_login_code_replaces_existing_active_code_in_same_scope(db_session):
    parent = create_parent(db_session, email="replacement@example.com")
    student = create_student(db_session, parent)

    first_issue = issue_student_login_code(
        db_session,
        parent,
        origin="parent_portal",
        requested_ip="127.0.0.1",
        student=student,
    )
    assert first_issue is not None
    first_code, _ = first_issue
    db_session.commit()

    stored_code = db_session.scalar(select(StudentLoginCodeToken).where(StudentLoginCodeToken.parent_user_id == parent.id))
    assert stored_code is not None
    stored_code.created_at = stored_code.created_at - timedelta(seconds=settings.student_login_code_request_cooldown_seconds + 1)
    db_session.commit()

    second_issue = issue_student_login_code(
        db_session,
        parent,
        origin="parent_portal",
        requested_ip="127.0.0.1",
        student=student,
    )
    assert second_issue is not None
    second_code, _ = second_issue
    db_session.commit()

    rows = db_session.scalars(select(StudentLoginCodeToken).where(StudentLoginCodeToken.parent_user_id == parent.id)).all()

    assert second_code != first_code
    assert len(rows) == 1


def test_deleting_parent_cascades_to_students_and_student_login_codes(db_session):
    parent = create_parent(db_session, email="studentcascade@example.com")
    student = create_student(db_session, parent)
    issue_student_login_code(
        db_session,
        parent,
        origin="parent_portal",
        requested_ip="127.0.0.1",
        student=student,
    )
    db_session.commit()

    db_session.delete(parent)
    db_session.commit()

    assert db_session.scalar(select(Student).where(Student.parent_user_id == parent.id)) is None
    assert db_session.scalar(select(StudentLoginCodeToken).where(StudentLoginCodeToken.parent_user_id == parent.id)) is None