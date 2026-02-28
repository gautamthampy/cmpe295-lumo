"""
Google Gemini LLM service wrapper.
Ready for Phase 2 integration into quiz, feedback, and lesson endpoints.
"""
from typing import Any, Optional
import logging

logger = logging.getLogger(__name__)


class GeminiService:
    def __init__(self, api_key: str, model: str = "gemini-1.5-pro"):
        self.api_key = api_key
        self.model = model
        self._client = None

        if api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=api_key)
                self._client = genai.GenerativeModel(model)
            except Exception as e:
                logger.warning(f"Gemini client init failed: {e}")

    async def generate_quiz_questions(
        self,
        topic: str,
        difficulty: str = "medium",
        num_questions: int = 5,
        context: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        """Generate quiz questions for a given topic using Gemini."""
        if not self._client:
            logger.warning("Gemini client not configured, returning empty list")
            return []

        prompt = f"""Generate {num_questions} multiple-choice quiz questions about "{topic}"
        for elementary school students. Difficulty: {difficulty}.
        {"Context: " + context if context else ""}

        Return as JSON array with fields: question_text, correct_answer, distractors (list of 3), explanation.
        """
        result = await self._generate_content(prompt)
        return []  # TODO: parse JSON from result

    async def generate_hint(
        self,
        question: str,
        student_answer: Optional[str] = None,
        hint_level: int = 1,
    ) -> str:
        """Generate a tiered hint for a quiz question."""
        if not self._client:
            return "Think about what you've learned in this lesson!"

        levels = {1: "subtle", 2: "moderate", 3: "direct"}
        prompt = f"""Provide a {levels[hint_level]} hint for this question: "{question}"
        {"Student answered: " + student_answer if student_answer else ""}
        Keep it encouraging and age-appropriate for elementary students."""
        return await self._generate_content(prompt)

    async def generate_feedback(
        self,
        question: str,
        correct_answer: str,
        student_answer: str,
        is_correct: bool,
    ) -> str:
        """Generate personalized feedback for a student's quiz answer."""
        if not self._client:
            return "Great effort! Keep practicing!" if is_correct else "Not quite — try again!"

        prompt = f"""A student answered a quiz question.
        Question: {question}
        Correct answer: {correct_answer}
        Student's answer: {student_answer}
        Result: {"Correct!" if is_correct else "Incorrect."}

        Provide brief, encouraging feedback (2-3 sentences) appropriate for elementary students."""
        return await self._generate_content(prompt)

    async def _generate_content(
        self,
        prompt: str,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """Low-level content generation call."""
        if not self._client:
            return ""
        try:
            response = self._client.generate_content(prompt)
            return response.text
        except Exception as e:
            logger.error(f"Gemini generation failed: {e}")
            return ""
