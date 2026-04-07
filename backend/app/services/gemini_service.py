"""
Gemini LLM Service for LUMO.

Provides hint generation and feedback generation using Google's Gemini API.
Falls back to deterministic mocks when GEMINI_API_KEY is not set.
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

_gemini_service_instance: Optional["GeminiService"] = None


class GeminiService:
    """Wrapper around Google Generative AI SDK for hint and feedback generation."""

    def __init__(self) -> None:
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
        self.model: Any = None

        if self.api_key:
            try:
                import google.generativeai as genai  # type: ignore[import-untyped]

                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel(self.model_name)
                logger.info("GeminiService initialized with model %s", self.model_name)
            except Exception as exc:
                logger.warning("Failed to initialize Gemini model: %s — using mocks", exc)
                self.model = None
        else:
            logger.info("GEMINI_API_KEY not set — GeminiService will use mock responses")

    # ------------------------------------------------------------------
    # Hint generation
    # ------------------------------------------------------------------
    async def generate_hint(
        self,
        question: str,
        student_answer: Optional[str] = None,
        hint_level: int = 1,
    ) -> str:
        """Generate a Socratic hint at the requested level."""
        if not self.model:
            return self._mock_hint(hint_level)

        try:
            prompt = (
                f"You are a friendly Socratic tutor for elementary school students. "
                f"Generate a hint (level {hint_level}/3) for this question:\n"
                f"Question: {question}\n"
            )
            if student_answer:
                prompt += f"Student's answer: {student_answer}\n"
            prompt += (
                "Rules:\n"
                "- Level 1: Give a subtle, open-ended nudge.\n"
                "- Level 2: Point toward the specific concept needed.\n"
                "- Level 3: Nearly reveal the answer, asking the student to make the final connection.\n"
                "- Keep it to 1-2 sentences.\n"
                "- Use simple, encouraging language appropriate for grades 2-4.\n"
                "- NEVER give the direct answer."
            )

            response = await self._call_model(prompt)
            return response
        except Exception as exc:
            logger.error("Gemini hint generation failed: %s", exc)
            return self._mock_hint(hint_level)

    # ------------------------------------------------------------------
    # Feedback / explanation generation
    # ------------------------------------------------------------------
    async def generate_feedback(
        self,
        question: str,
        correct_answer: str,
        student_answer: str,
        is_correct: bool = False,
    ) -> Dict[str, str]:
        """Generate an explanation and motivational message for a quiz answer."""
        if not self.model:
            return self._mock_feedback(correct_answer, student_answer, is_correct)

        try:
            prompt = (
                "You are a warm, encouraging tutor for elementary school students (grades 2-4).\n"
                f"Question: {question}\n"
                f"Student's answer: {student_answer}\n"
                f"Correct answer: {correct_answer}\n"
                f"The answer is {'correct' if is_correct else 'incorrect'}.\n\n"
                "Respond in JSON with exactly two keys:\n"
                '  "explanation": a 1-3 sentence explanation of why the answer is right or wrong\n'
                '  "motivation": a short encouraging message (1 sentence)\n\n'
                "Rules:\n"
                "- Use simple, positive language.\n"
                "- Never use words like 'wrong', 'stupid', 'fail', or 'bad'.\n"
                "- Focus on growth mindset."
            )

            response = await self._call_model(prompt)
            try:
                # Try to parse as JSON
                cleaned = response.strip()
                if cleaned.startswith("```"):
                    cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned
                    cleaned = cleaned.rsplit("```", 1)[0]
                parsed = json.loads(cleaned)
                return {
                    "explanation": parsed.get("explanation", f"The correct answer is {correct_answer}."),
                    "motivation": parsed.get("motivation", "Keep going! You're learning."),
                }
            except (json.JSONDecodeError, AttributeError):
                return {
                    "explanation": response,
                    "motivation": "Keep going! You're learning.",
                }
        except Exception as exc:
            logger.error("Gemini feedback generation failed: %s", exc)
            return self._mock_feedback(correct_answer, student_answer, is_correct)

    # ------------------------------------------------------------------
    # Motivation generation
    # ------------------------------------------------------------------
    async def generate_motivation(
        self,
        error_count: int = 1,
        question_context: Optional[str] = None,
    ) -> str:
        """Generate a standalone motivational message."""
        if not self.model:
            return self._mock_motivation(error_count)

        try:
            prompt = (
                "You are a warm, encouraging learning coach for elementary school students.\n"
                f"The student has gotten {error_count} question(s) wrong recently.\n"
            )
            if question_context:
                prompt += f"They are studying: {question_context}\n"
            prompt += (
                "Write a short (1-2 sentences) motivational message that:\n"
                "- Encourages them to keep trying\n"
                "- Uses a growth mindset tone\n"
                "- Is age-appropriate for grades 2-4\n"
                "- Never uses negative words"
            )

            return await self._call_model(prompt)
        except Exception as exc:
            logger.error("Gemini motivation generation failed: %s", exc)
            return self._mock_motivation(error_count)

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    async def _call_model(self, prompt: str) -> str:
        """Call the Gemini model and return the text response."""
        response = self.model.generate_content(prompt)
        return response.text.strip()

    @staticmethod
    def _mock_hint(level: int) -> str:
        hints = {
            1: "Think about what you already know about this topic. What clues can you find?",
            2: "Look at the key words in the question. Which concept do they connect to?",
            3: "You're very close! The answer relates directly to the main idea of the lesson.",
        }
        return hints.get(level, "Take another careful look at the question.")

    @staticmethod
    def _mock_feedback(correct_answer: str, student_answer: str, is_correct: bool) -> Dict[str, str]:
        if is_correct:
            return {
                "explanation": f"Great job! {correct_answer} is exactly right.",
                "motivation": "You're doing amazing! Keep up the great work!",
            }
        return {
            "explanation": (
                f"Not quite — the correct answer is {correct_answer}. "
                f"Let's review this concept together so it clicks next time."
            ),
            "motivation": "Every mistake is a step toward learning! You've got this.",
        }

    @staticmethod
    def _mock_motivation(error_count: int) -> str:
        if error_count <= 1:
            return "Great effort! One small slip is totally normal. Let's try again!"
        if error_count <= 3:
            return "You're working really hard, and that's what matters most. Keep going!"
        return "Learning takes time, and you're being so brave by sticking with it. Let's take one more try together!"


def get_gemini_service() -> GeminiService:
    """Return a singleton GeminiService instance."""
    global _gemini_service_instance
    if _gemini_service_instance is None:
        _gemini_service_instance = GeminiService()
    return _gemini_service_instance
