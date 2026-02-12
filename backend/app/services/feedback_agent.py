"""
Feedback & Motivation Agent Service
Handles tiered hint generation, error explanations, and motivational messages.
Coordinates with GeminiService for LLM-based content and mocks other agent interactions.
"""
from typing import Dict, Any, Optional, List
from app.services.gemini_service import gemini_service
import logging

logger = logging.getLogger(__name__)

class FeedbackAgent:
    """
    Feedback Agent responsible for:
    1. Generating tiered hints (subtle -> moderate -> direct)
    2. Providing explanations for incorrect answers
    3. Generating motivational messages
    4. Triggering re-quizzes (mocked)
    """

    def __init__(self):
        self.gemini = gemini_service

    async def generate_hint(
        self,
        question_id: str,
        user_id: str,
        session_id: str,
        hint_level: int = 1,
        misconception_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate a hint based on the question context and requested level.
        
        Args:
            question_id: UUID of the question
            user_id: UUID of the user
            session_id: UUID of the session
            hint_level: 1 (subtle), 2 (moderate), 3 (direct)
            misconception_type: Optional detected misconception tag
            
        Returns:
            Dict containing hint text and metadata
        """
        # 1. Fetch question context (Mocked for now)
        question_context = self._get_mock_question_context(question_id)
        
        # 2. Construct prompt context
        # In a real scenario, we'd fetch previous hints from DB to avoid repetition
        
        try:
            # 3. Call LLM to generate hint
            if self.gemini.model:
                hint_text = await self.gemini.generate_hint(
                    question=question_context["text"],
                    student_answer=None, # We might want to pass this if available
                    hint_level=hint_level
                )
            else:
                hint_text = self._get_mock_hint(question_context["text"], hint_level)

            # 4. Log event (Mocked Analytics)
            self._log_feedback_event(user_id, "hint_generated", {
                "question_id": question_id,
                "level": hint_level,
                "misconception": misconception_type
            })

            return {
                "hint_text": hint_text,
                "hint_level": hint_level,
                "question_id": question_id,
                "misconception_type": misconception_type
            }

        except Exception as e:
            logger.error(f"Error generating hint: {e}")
            # Fallback to static hint
            return {
                "hint_text": "Review the core concepts related to this question.",
                "hint_level": hint_level,
                "question_id": question_id,
                "is_fallback": True
            }

    async def generate_explanation(
        self,
        question_id: str,
        user_answer: str,
        correct_answer: str,
        misconception_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate an explanation for an incorrect answer containing:
        - Why the user's answer might be wrong (addressing misconception)
        - Why the correct answer is right
        - A motivational nudge
        """
        question_context = self._get_mock_question_context(question_id)
        
        try:
            if self.gemini.model:
                feedback_data = await self.gemini.generate_feedback(
                    question=question_context["text"],
                    correct_answer=correct_answer,
                    student_answer=user_answer,
                    is_correct=False
                )
                
                if isinstance(feedback_data, dict):
                    explanation = feedback_data.get("explanation", "Review the concept.")
                    motivation = feedback_data.get("motivation", "Keep going!")
                else:
                    explanation = str(feedback_data)
                    motivation = "Keep going! You're learning."
            else:
                explanation = f"The correct answer is {correct_answer}. Your answer {user_answer} was incorrect."
                motivation = "Don't give up! Mistakes help us learn."

            self._log_feedback_event("unknown_user", "explanation_generated", {
                "question_id": question_id,
                "misconception": misconception_type
            })

            return {
                "explanation": explanation,
                "motivational_message": motivation,
                "question_id": question_id
            }

        except Exception as e:
            logger.error(f"Error generating explanation: {e}")
            return {
                "explanation": f"The correct answer is {correct_answer}.",
                "motivational_message": "Keep trying!",
                "is_fallback": True
            }

    async def trigger_re_quiz(self, quiz_id: str, user_id: str) -> Dict[str, Any]:
        """
        Determine if a re-quiz is needed based on performance (Mocked).
        """
        # Logic: Check user mastery/score (Mocked)
        # If score < threshold, trigger re-quiz
        
        return {
            "re_quiz_triggered": True,
            "reason": "mastery_gap_detected",
            "suggested_quiz_params": {
                "topic": "previous_topic",
                "difficulty": "easier"
            }
        }

    def _get_mock_question_context(self, question_id: str) -> Dict[str, Any]:
        """Mock fetching question details from database"""
        return {
            "id": question_id,
            "text": "What is the primary function of the mitochondria?",
            "subject": "Biology",
            "grade_level": 9
        }

    def _get_mock_hint(self, question_text: str, level: int) -> str:
        """Fallback mock hints if LLM is unavailable"""
        hints = {
            1: "Think about energy production in the cell.",
            2: "It's often called the powerhouse of the cell.",
            3: "It produces ATP (Adenosine Triphosphate)."
        }
        return hints.get(level, "Think about the question carefully.")

    def _log_feedback_event(self, user_id: str, event_type: str, data: Dict[str, Any]):
        """Mock sending event to Analytics Agent"""
        logger.info(f"[Analytics Event] User: {user_id}, Type: {event_type}, Data: {data}")

# Global instance
feedback_agent = FeedbackAgent()
