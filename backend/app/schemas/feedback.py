from pydantic import BaseModel, Field
from typing import Optional

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

class ReQuizRequest(BaseModel):
    quiz_id: str
    user_id: str
