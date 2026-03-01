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

    async def generate_lesson_content(
        self,
        topic: str,
        grade_level: int = 3,
        subject: str = "Mathematics",
    ) -> str:
        """
        Generate a micro-lesson in MDX format for the given topic and grade level.

        Returns MDX string ready for rendering. Falls back to a template stub
        if Gemini is not configured.
        """
        if not self._client:
            logger.warning("Gemini not configured — returning stub lesson MDX")
            return _stub_lesson_mdx(topic, grade_level, subject)

        prompt = f"""Write a micro-lesson in Markdown (MDX-compatible) about "{topic}" for grade {grade_level} {subject} students.

Requirements:
- Use ## for section headings (2-4 sections)
- Keep total word count between 150 and 400 words
- Use **bold** for key terms on first use
- Use numbered lists for steps, bullet lists for examples
- Start with "## What Is {topic}?" section
- End with "## Key Takeaway" section (2-3 sentences)
- Language must be simple and encouraging for elementary students
- Do NOT include JSX components, import statements, or HTML tags

Output ONLY the Markdown content, no preamble.
"""
        mdx = await self._generate_content(prompt)
        return mdx if mdx.strip() else _stub_lesson_mdx(topic, grade_level, subject)

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


def _stub_lesson_mdx(topic: str, grade_level: int, subject: str) -> str:
    """Fallback MDX template used when Gemini API is not configured."""
    return f"""## What Is {topic}?

**{topic}** is an important concept in grade {grade_level} {subject}.
In this lesson you will learn the key ideas and how to use them.

## Key Ideas

Learning {topic} helps you build important skills.
Here are some things to keep in mind:

- Focus on understanding the concept step by step.
- Practice with examples to build confidence.
- Ask questions when something is unclear.

## Let's Practice

Work through the following ideas as you study {topic}:

1. Start with what you already know.
2. Connect new ideas to familiar ones.
3. Check your understanding with the quiz at the end.

## Key Takeaway

**{topic}** is a foundational skill in {subject}. Take your time to understand each part,
and remember: every expert started as a beginner!
"""


# Module-level singleton
_service: Optional["GeminiService"] = None


def get_gemini_service(api_key: str = "", model: str = "gemini-1.5-pro") -> "GeminiService":
    global _service
    if _service is None:
        _service = GeminiService(api_key=api_key, model=model)
    return _service
