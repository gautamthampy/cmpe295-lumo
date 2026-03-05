"""Pydantic schemas for auth endpoints."""
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# ------------------------------------------------------------------
# Request schemas
# ------------------------------------------------------------------

class ParentRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    display_name: str = Field(min_length=1, max_length=100)


class ParentLogin(BaseModel):
    email: EmailStr
    password: str


class StudentCreate(BaseModel):
    display_name: str = Field(min_length=1, max_length=100)
    grade_level: int = Field(ge=1, le=12)
    pin: str = Field(min_length=4, max_length=4, pattern=r"^\d{4}$")
    avatar_id: Optional[str] = "avatar-01"
    consent_given: bool = False


class StudentLogin(BaseModel):
    pin: str = Field(min_length=4, max_length=4, pattern=r"^\d{4}$")


class StudentUpdate(BaseModel):
    display_name: Optional[str] = Field(None, min_length=1, max_length=100)
    grade_level: Optional[int] = Field(None, ge=1, le=12)
    pin: Optional[str] = Field(None, min_length=4, max_length=4, pattern=r"^\d{4}$")
    avatar_id: Optional[str] = None
    consent_given: Optional[bool] = None


class SubjectEnroll(BaseModel):
    subject_id: UUID


# ------------------------------------------------------------------
# Response schemas
# ------------------------------------------------------------------

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: Literal["parent", "student"]
    expires_in: int  # seconds


class SubjectResponse(BaseModel):
    subject_id: UUID
    name: str
    slug: str

    model_config = {"from_attributes": True}


class StudentResponse(BaseModel):
    student_id: UUID
    display_name: str
    grade_level: int
    avatar_id: Optional[str]
    consent_given: bool
    subjects: list[SubjectResponse] = []

    model_config = {"from_attributes": True}


class ParentResponse(BaseModel):
    parent_id: UUID
    email: str
    display_name: str
    students: list[StudentResponse] = []

    model_config = {"from_attributes": True}
