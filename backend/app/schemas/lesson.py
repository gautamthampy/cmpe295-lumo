"""Pydantic schemas for lesson endpoints."""
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class LessonCreate(BaseModel):
    title: str
    subject: str
    grade_level: int = Field(ge=1, le=12)
    content_mdx: str
    misconception_tags: list[str] = []


class LessonResponse(BaseModel):
    lesson_id: UUID
    title: str
    subject: str
    grade_level: int
    content_mdx: str
    misconception_tags: list[str]
    status: str
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class QuizContext(BaseModel):
    """Data the Quiz Agent needs to generate a quiz for this lesson."""
    lesson_id: UUID
    misconception_tags: list[str]
    subject: str
    grade_level: int
    suggested_question_count: int = 3


class AccessibilityIssue(BaseModel):
    rule: str
    severity: str  # "error" | "warning"
    message: str


class RenderedLessonResponse(BaseModel):
    lesson_id: UUID
    html_content: str
    estimated_time_minutes: int
    accessibility_score: float = Field(default=0.0, ge=0, le=1)
    accessibility_issues: list[AccessibilityIssue] = []
    misconception_tags: list[str]
    quiz_context: QuizContext


# --------------- Quiz schemas (used by mock endpoint) ---------------

class QuizOption(BaseModel):
    option_id: str
    option_text: str
    is_distractor: bool
    misconception_type: Optional[str] = None


class QuizQuestion(BaseModel):
    question_id: str
    question_text: str
    options: list[QuizOption]
    difficulty: str = "medium"


class QuizResponse(BaseModel):
    quiz_id: str
    lesson_id: str
    questions: list[QuizQuestion]
    generated_at: str
