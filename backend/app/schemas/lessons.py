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
    accessibility_score: int
    quiz_pass_rate: int
    status: str = "active"


class LessonAnalyticsSummaryResponse(BaseModel):
    total_lessons: int
    avg_accessibility: int
    avg_quiz_pass: int
    lessons: list[LessonAnalyticsMetricResponse] = Field(default_factory=list)