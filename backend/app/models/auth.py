from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class ParentUser(Base):
    __tablename__ = "parent_users"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, server_default=func.now())

    sessions: Mapped[list[AuthSession]] = relationship(back_populates="parent_user", cascade="all, delete-orphan")
    verification_tokens: Mapped[list[EmailVerificationToken]] = relationship(back_populates="parent_user", cascade="all, delete-orphan")
    password_reset_tokens: Mapped[list[PasswordResetToken]] = relationship(back_populates="parent_user", cascade="all, delete-orphan")
    students: Mapped[list[Student]] = relationship(back_populates="parent_user", cascade="all, delete-orphan")
    student_login_codes: Mapped[list[StudentLoginCodeToken]] = relationship(back_populates="parent_user", cascade="all, delete-orphan")


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    parent_user_id: Mapped[str] = mapped_column(Uuid(as_uuid=False), ForeignKey("parent_users.id", ondelete="CASCADE"), index=True, nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    remember_me: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now())

    parent_user: Mapped[ParentUser] = relationship(back_populates="sessions")


class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    parent_user_id: Mapped[str] = mapped_column(Uuid(as_uuid=False), ForeignKey("parent_users.id", ondelete="CASCADE"), index=True, nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now())

    parent_user: Mapped[ParentUser] = relationship(back_populates="verification_tokens")


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    parent_user_id: Mapped[str] = mapped_column(Uuid(as_uuid=False), ForeignKey("parent_users.id", ondelete="CASCADE"), index=True, nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now())

    parent_user: Mapped[ParentUser] = relationship(back_populates="password_reset_tokens")


class Student(Base):
    __tablename__ = "students"

    student_id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    parent_user_id: Mapped[str] = mapped_column(Uuid(as_uuid=False), ForeignKey("parent_users.id", ondelete="CASCADE"), index=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    grade_level: Mapped[int] = mapped_column(Integer, nullable=False)
    avatar_id: Mapped[str] = mapped_column(String(50), nullable=False, default="owl")
    consent_given: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, server_default=func.now())

    parent_user: Mapped[ParentUser] = relationship(back_populates="students")
    login_codes: Mapped[list[StudentLoginCodeToken]] = relationship(back_populates="student")


class StudentLoginCodeToken(Base):
    __tablename__ = "student_login_code_tokens"

    id: Mapped[str] = mapped_column(Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4()))
    parent_user_id: Mapped[str] = mapped_column(Uuid(as_uuid=False), ForeignKey("parent_users.id", ondelete="CASCADE"), index=True, nullable=False)
    student_id: Mapped[str | None] = mapped_column(Uuid(as_uuid=False), ForeignKey("students.student_id", ondelete="CASCADE"), index=True, nullable=True)
    delivery_email: Mapped[str] = mapped_column(String(320), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    request_origin: Mapped[str] = mapped_column(String(32), nullable=False, default="student_login")
    requested_ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, server_default=func.now())

    parent_user: Mapped[ParentUser] = relationship(back_populates="student_login_codes")
    student: Mapped[Student | None] = relationship(back_populates="login_codes")
