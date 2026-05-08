from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class LessonSummaryResponse(BaseModel):
    lesson_id: str
    title: str
    subject: str
    grade_level: int
    status: str = "active"
    prerequisites: list[str] = Field(default_factory=list)
    misconception_tags: list[str] = Field(default_factory=list)


class LessonQuizContextResponse(BaseModel):
    subject: str
    grade_level: int


class LessonRenderResponse(BaseModel):
    lesson_id: str
    title: str
    html_content: str
    interactive_activities: list[dict[str, Any]] = Field(default_factory=list)
    misconception_tags: list[str] = Field(default_factory=list)
    accessibility_score: float
    accessibility_issues: list[str] = Field(default_factory=list)
    estimated_time_minutes: int
    quiz_context: LessonQuizContextResponse
    next_lesson_id: str | None = None
    prerequisites_met: bool = True


class LessonAnalyticsMetricResponse(BaseModel):
    lesson_id: str
    title: str
    subject: str
    grade_level: int
    quiz_pass_rate: int
    status: str = "active"


class LessonAnalyticsSummaryResponse(BaseModel):
    total_lessons: int
    avg_quiz_pass: int
    lessons: list[LessonAnalyticsMetricResponse] = Field(default_factory=list)


# --------------- Quiz schemas ---------------

class QuizOption(BaseModel):
    option_id: str
    option_text: str
    is_distractor: bool
    misconception_type: str | None = None


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


# --------------- Accessibility schemas ---------------

class AccessibilityIssue(BaseModel):
    rule: str
    severity: str  # "error" | "warning"
    message: str