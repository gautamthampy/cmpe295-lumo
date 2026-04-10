from pydantic import BaseModel, Field
from typing import Optional


# ── Request Schemas ──────────────────────────────────────────────────

class HintRequest(BaseModel):
    question_id: str = Field(..., description="ID of the question")
    question_text: str = Field(..., description="The actual text of the question")
    user_id: str = Field(..., description="UUID or ID of the user")
    session_id: str = Field(..., description="UUID or ID of the session")
    hint_level: int = Field(default=1, ge=1, le=3, description="Level of hint: 1 (subtle), 2 (moderate), 3 (direct)")
    misconception_type: Optional[str] = Field(default=None, description="Optional detected misconception tag")

class ExplanationRequest(BaseModel):
    question_id: str = Field(..., description="ID of the question")
    question_text: str = Field(..., description="The actual text of the question")
    user_answer: str = Field(..., description="The answer provided by the user")
    correct_answer: str = Field(..., description="The correct answer for the question")
    user_id: str = Field(default="unknown", description="UUID or ID of the user")
    session_id: Optional[str] = Field(default=None, description="UUID or ID of the session")
    misconception_type: Optional[str] = Field(default=None, description="Optional detected misconception tag")

class MotivationRequest(BaseModel):
    user_id: str = Field(..., description="UUID or ID of the user")
    session_id: Optional[str] = Field(default=None, description="UUID or ID of the session")
    error_count: int = Field(default=1, ge=0, description="Number of recent errors")
    question_context: Optional[str] = Field(default=None, description="Topic or subject context")

class ReQuizRequest(BaseModel):
    quiz_id: str
    user_id: str


class AttentionSignalRequest(BaseModel):
    """Attention engine recommends recap/break/continue to Feedback/Planner."""

    user_id: str = Field(..., description="Learner user UUID")
    session_id: str = Field(..., description="Learning session UUID")
    recommended_action: str = Field(..., description="continue | recap | break")
    rationale: str = Field(default="", description="Short explanation for logs/UX")


class AttentionSignalResponse(BaseModel):
    status: str = "ok"


# ── Response Schemas ─────────────────────────────────────────────────

class HintResponse(BaseModel):
    hint_text: str
    hint_level: int
    question_id: str
    misconception_type: Optional[str] = None
    is_fallback: bool = False

class ExplanationResponse(BaseModel):
    explanation: str
    motivational_message: str
    question_id: str
    is_fallback: bool = False

class MotivationResponse(BaseModel):
    message: str
    error_count: int
    is_fallback: bool = False

class ReQuizResponse(BaseModel):
    re_quiz_triggered: bool
    reason: str
    suggested_quiz_params: dict
