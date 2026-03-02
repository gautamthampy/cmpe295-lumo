"""
Google Gemini LLM service wrapper.
Ready for Phase 2 integration into quiz, feedback, and lesson endpoints.
"""
from functools import lru_cache
from typing import Any, Optional
import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Interactive activity schema spec injected into the lesson generation prompt
# ---------------------------------------------------------------------------

_INTERACTIVE_SCHEMA_SPEC = """
You may include 2-3 interactive activities inline within the lesson using this format:

<!-- interactive -->
{JSON object — see schemas below}
<!-- /interactive -->

Place each activity on its own paragraph (blank line before and after).

ACTIVITY SCHEMAS (choose the type that fits best):

1. FillInBlank — complete a sentence/equation
{"type":"FillInBlank","id":"act-1","instruction":"<student-facing text>",
 "misconception_tag":"<tag or null>","difficulty":"standard",
 "data":{"prompt":"<sentence with ___ for blank>","answer":"<correct text>","hint":"<optional>"}}

2. TrueOrFalse
{"type":"TrueOrFalse","id":"act-2","instruction":"<text>",
 "misconception_tag":"<tag or null>","difficulty":"standard",
 "data":{"statement":"<statement>","correct":true,"explanation":"<shown after answer>"}}

3. MultipleChoice
{"type":"MultipleChoice","id":"act-3","instruction":"<text>",
 "misconception_tag":"<tag or null>","difficulty":"standard",
 "data":{"question":"<question>","options":[{"id":"a","text":"..."},{"id":"b","text":"..."},{"id":"c","text":"..."}],"correct_id":"b"}}

4. DragToSort — put items in the correct order
{"type":"DragToSort","id":"act-4","instruction":"<text>",
 "misconception_tag":"<tag or null>","difficulty":"standard",
 "data":{"items":["<item3>","<item1>","<item2>"],"correct_order":["<item1>","<item2>","<item3>"]}}

5. MatchPairs — connect left items to right items
{"type":"MatchPairs","id":"act-5","instruction":"<text>",
 "misconception_tag":"<tag or null>","difficulty":"standard",
 "data":{"pairs":[{"left":"<a>","right":"<x>"},{"left":"<b>","right":"<y>"}]}}

6. NumberLine (Math only)
{"type":"NumberLine","id":"act-6","instruction":"<text>",
 "misconception_tag":"<tag or null>","difficulty":"standard",
 "data":{"min":0,"max":1,"divisions":4,"target":0.75}}

RULES:
- Valid JSON only (no trailing commas, no comments inside JSON)
- Unique ids: act-1, act-2, act-3
- instruction must be simple English for 8-9 year olds
- misconception_tag must be one of the lesson misconception tags, or null
- Place activities inside a section after explanatory text, never at the document start/end
"""


class GeminiService:
    def __init__(self, api_key: str, model: str = "gemini-3.1-pro-preview"):
        self.api_key = api_key
        self.model = model
        self._client = None

        if api_key:
            try:
                from google import genai
                self._client = genai.Client(api_key=api_key)
            except Exception as e:
                logger.warning(f"Gemini client init failed: {e}")

    async def generate_lesson_content(
        self,
        topic: str,
        grade_level: int = 3,
        subject: str = "Mathematics",
        misconception_tags: Optional[list[str]] = None,
    ) -> str:
        """
        Generate a micro-lesson in MDX format with embedded interactive activities.

        Returns MDX string ready for rendering. Falls back to a template stub
        if Gemini is not configured.
        """
        if not self._client:
            logger.warning("Gemini not configured — returning stub lesson MDX")
            return _stub_lesson_mdx(topic, grade_level, subject, misconception_tags)

        tags_str = ", ".join(misconception_tags) if misconception_tags else "none specified"

        prompt = f"""Write a micro-lesson in Markdown (MDX-compatible) about "{topic}" for grade {grade_level} {subject} students.

Requirements:
- Use ## for section headings (3-4 sections)
- Keep total word count between 200 and 400 words (excluding interactive blocks)
- Use **bold** for key terms on first use
- Use numbered lists for steps, bullet lists for examples
- Start with "## What Is {topic}?" section
- End with "## Key Takeaway" section (2-3 sentences)
- Language must be simple and encouraging for 8-9 year old students
- Do NOT include JSX components, import statements, or raw HTML tags

MISCONCEPTION TAGS FOR THIS LESSON: {tags_str}

{_INTERACTIVE_SCHEMA_SPEC}

Output ONLY the Markdown content with embedded interactive blocks, no preamble or explanation.
"""
        mdx = await self._generate_content(prompt)
        return mdx if mdx.strip() else _stub_lesson_mdx(topic, grade_level, subject, misconception_tags)

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
        """Low-level async content generation call using the google-genai SDK."""
        if not self._client:
            return ""
        try:
            response = await self._client.aio.models.generate_content(
                model=self.model,
                contents=prompt,
            )
            return response.text
        except Exception as e:
            logger.error(f"Gemini generation failed: {e}")
            return ""


def _stub_lesson_mdx(
    topic: str,
    grade_level: int,
    subject: str,
    misconception_tags: Optional[list[str]] = None,
) -> str:
    """Fallback MDX template with interactive examples, used when Gemini API is not configured."""
    tag = (misconception_tags[0] if misconception_tags else None)
    tag_json = f'"{tag}"' if tag else "null"
    return f"""## What Is {topic}?

**{topic}** is an important concept in grade {grade_level} {subject}.
In this lesson you will learn the key ideas and how to use them.

<!-- interactive -->
{{"type":"TrueOrFalse","id":"act-1","instruction":"Check your understanding","misconception_tag":{tag_json},"difficulty":"standard","data":{{"statement":"Learning {topic} step by step makes it easier to understand.","correct":true,"explanation":"Breaking things into steps helps you learn faster and remember more!"}}}}
<!-- /interactive -->

## Key Ideas

Learning **{topic}** helps you build important skills.
Here are some things to keep in mind:

- Focus on understanding the concept step by step.
- Practice with examples to build confidence.
- Ask questions when something is unclear.

<!-- interactive -->
{{"type":"MultipleChoice","id":"act-2","instruction":"Choose the best answer","misconception_tag":null,"difficulty":"standard","data":{{"question":"What is the best strategy when learning something new like {topic}?","options":[{{"id":"a","text":"Give up if it feels hard"}},{{"id":"b","text":"Practice step by step with examples"}},{{"id":"c","text":"Skip the practice and just memorize"}}],"correct_id":"b"}}}}
<!-- /interactive -->

## Let's Practice

Work through the following ideas as you study **{topic}**:

1. Start with what you already know.
2. Connect new ideas to familiar ones.
3. Check your understanding with the quiz at the end.

## Key Takeaway

**{topic}** is a foundational skill in {subject}. Take your time to understand each part,
and remember: every expert started as a beginner!
"""


@lru_cache(maxsize=1)
def get_gemini_service() -> "GeminiService":
    """Return a cached GeminiService instance seeded from application settings.

    The API key and model are read from settings (which load backend/.env), so
    there is no need to pass them at the call site.
    """
    from app.core.config import get_settings
    s = get_settings()
    return GeminiService(api_key=s.GEMINI_API_KEY, model=s.GEMINI_MODEL)
