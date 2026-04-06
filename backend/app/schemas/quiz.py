"""Pydantic schemas for the Quiz Agent endpoints."""
from typing import Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Generate request / response
# ---------------------------------------------------------------------------

class QuizGenerateRequest(BaseModel):
    lesson_id: str
    user_id: str
    misconception_tags: list[str]
    subject: str = "Mathematics"
    grade_level: int = Field(default=3, ge=1, le=12)
    question_count: int = Field(default=3, ge=1, le=10)
    difficulty: str = "medium"  # "easy" | "medium" | "hard"


# Re-export the shared option/question/response shapes so callers only need
# to import from this module.
from app.schemas.lesson import QuizOption, QuizQuestion, QuizResponse  # noqa: E402, F401


# ---------------------------------------------------------------------------
# Submit request / response
# ---------------------------------------------------------------------------

class QuizAnswer(BaseModel):
    question_id: str
    selected_option_id: str


class QuizSubmitRequest(BaseModel):
    quiz_id: str
    user_id: str
    answers: list[QuizAnswer]


class QuestionResult(BaseModel):
    question_id: str
    question_text: str
    selected_option_id: str
    correct_option_id: str
    is_correct: bool
    misconception_triggered: Optional[str] = None


class QuizSubmitResponse(BaseModel):
    quiz_id: str
    score: float = Field(ge=0.0, le=1.0)
    correct_count: int
    total_questions: int
    passed: bool
    pass_threshold: float = 0.7
    difficulty: str
    results: list[QuestionResult]
    misconceptions_triggered: list[str]
    rationale: str
