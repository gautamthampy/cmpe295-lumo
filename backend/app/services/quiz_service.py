"""
Quiz Agent service.

Generates adaptive multiple-choice quizzes from lesson misconception tags.
Uses Gemini AI when an API key is configured; falls back automatically to
deterministic misconception templates so the demo always works.
"""
import json
import logging
import random
import uuid
from datetime import datetime, timezone
from typing import Optional

from app.schemas.lesson import QuizOption, QuizQuestion, QuizResponse
from app.schemas.quiz import (
    QuestionResult,
    QuizAnswer,  # noqa: F401 – imported so callers can use one module
    QuizGenerateRequest,
    QuizSubmitRequest,
    QuizSubmitResponse,
)

logger = logging.getLogger(__name__)

PASS_THRESHOLD = 0.7

# ---------------------------------------------------------------------------
# Fallback misconception templates (mirrors mock_quiz.py so the demo is
# self-contained even without a Gemini key)
# ---------------------------------------------------------------------------

MISCONCEPTION_TEMPLATES: dict[str, dict] = {
    "fraction-as-two-numbers": {
        "question": "What does the fraction 3/4 mean?",
        "correct": "3 out of 4 equal parts",
        "distractors": [
            ("The numbers 3 and 4 separately", "fraction-as-two-numbers"),
            ("3 plus 4 equals 7", "fraction-as-two-numbers"),
            ("4 divided into 3 pieces each", "denominator-confusion"),
        ],
    },
    "denominator-confusion": {
        "question": "In the fraction 2/5, what does the 5 tell you?",
        "correct": "The whole is split into 5 equal parts",
        "distractors": [
            ("You have 5 parts colored", "denominator-confusion"),
            ("The answer is 5", "fraction-as-two-numbers"),
            ("You need 5 more to make a whole", "whole-vs-part"),
        ],
    },
    "whole-vs-part": {
        "question": "A pizza is cut into 8 equal slices. You eat 3. What fraction did you eat?",
        "correct": "3/8",
        "distractors": [
            ("8/3", "whole-vs-part"),
            ("5/8", "whole-vs-part"),
            ("3/5", "denominator-confusion"),
        ],
    },
    "multiplication-as-addition": {
        "question": "What does 4 × 3 mean?",
        "correct": "4 groups of 3",
        "distractors": [
            ("4 plus 3", "multiplication-as-addition"),
            ("4 minus 3", "multiplication-as-addition"),
            ("3 groups of 4 minus 1", "commutative-confusion"),
        ],
    },
    "commutative-confusion": {
        "question": "Which equation shows the commutative property of multiplication?",
        "correct": "6 × 4 = 4 × 6",
        "distractors": [
            ("6 + 4 = 4 + 6", "multiplication-as-addition"),
            ("6 × 4 ≠ 4 × 6", "commutative-confusion"),
            ("6 × 4 = 6 + 6 + 6 + 6", "multiplication-as-addition"),
        ],
    },
    "zero-property-error": {
        "question": "What is 7 × 0?",
        "correct": "0",
        "distractors": [
            ("7", "zero-property-error"),
            ("1", "zero-property-error"),
            ("70", "zero-property-error"),
        ],
    },
    "hour-minute-swap": {
        "question": "On a clock, which hand tells the hour?",
        "correct": "The short hand",
        "distractors": [
            ("The long hand", "hour-minute-swap"),
            ("Both hands together", "hour-minute-swap"),
            ("The hand pointing up", "analog-digital-mismatch"),
        ],
    },
    "analog-digital-mismatch": {
        "question": "The short hand points to 4 and the long hand points to 6. What time is it?",
        "correct": "4:30",
        "distractors": [
            ("6:04", "analog-digital-mismatch"),
            ("4:06", "hour-minute-swap"),
            ("6:30", "analog-digital-mismatch"),
        ],
    },
    "12hr-24hr-confusion": {
        "question": "School ends at 3:00 PM. In 24-hour time, what is 3:00 PM?",
        "correct": "15:00",
        "distractors": [
            ("3:00", "12hr-24hr-confusion"),
            ("13:00", "12hr-24hr-confusion"),
            ("03:00", "12hr-24hr-confusion"),
        ],
    },
    "unit-mismatch": {
        "question": "Which unit is best for measuring the length of a pencil?",
        "correct": "Inches or centimeters",
        "distractors": [
            ("Miles or kilometers", "unit-mismatch"),
            ("Pounds or kilograms", "unit-mismatch"),
            ("Gallons or liters", "unit-mismatch"),
        ],
    },
    "ruler-start-at-one": {
        "question": "Where should you place the ruler to start measuring correctly?",
        "correct": "At the zero mark (the very beginning of the ruler)",
        "distractors": [
            ("At the number 1", "ruler-start-at-one"),
            ("At the middle of the ruler", "ruler-start-at-one"),
            ("At the highest number and count backwards", "estimation-error"),
        ],
    },
    "estimation-error": {
        "question": "About how tall is a classroom door?",
        "correct": "About 2 meters (7 feet)",
        "distractors": [
            ("About 2 centimeters", "estimation-error"),
            ("About 20 meters", "estimation-error"),
            ("About 2 millimeters", "estimation-error"),
        ],
    },
    "division-as-subtraction": {
        "question": "What does 12 ÷ 4 mean?",
        "correct": "Split 12 into 4 equal groups",
        "distractors": [
            ("Subtract 4 from 12 three times", "division-as-subtraction"),
            ("Add 4 to itself 12 times", "division-as-subtraction"),
            ("Multiply 12 and 4 together", "dividend-divisor-swap"),
        ],
    },
    "remainder-confusion": {
        "question": "What is the remainder when 13 is divided by 4?",
        "correct": "1 (because 4 × 3 = 12, and 13 − 12 = 1)",
        "distractors": [
            ("4 (the same as the divisor)", "remainder-confusion"),
            ("3 (the quotient)", "remainder-confusion"),
            ("0 (there is no remainder)", "remainder-confusion"),
        ],
    },
    "dividend-divisor-swap": {
        "question": "In the expression 20 ÷ 5, which number is the dividend?",
        "correct": "20 — it is the total being divided",
        "distractors": [
            ("5 — it is being divided", "dividend-divisor-swap"),
            ("4 — it is the result", "dividend-divisor-swap"),
            ("Both 20 and 5 are dividends", "dividend-divisor-swap"),
        ],
    },
}

# ---------------------------------------------------------------------------
# In-memory quiz store (sufficient for a demo prototype)
# ---------------------------------------------------------------------------

_quiz_store: dict[str, QuizResponse] = {}
_quiz_meta: dict[str, dict] = {}


# ---------------------------------------------------------------------------
# QuizAgent
# ---------------------------------------------------------------------------

class QuizAgent:
    """
    Generates and scores adaptive quizzes.

    Generation order:
      1. Try Gemini AI (structured JSON prompt)
      2. Fall back to deterministic misconception templates
    """

    async def generate(self, request: QuizGenerateRequest) -> QuizResponse:
        questions: list[QuizQuestion] = []

        gemini_service = _get_gemini()
        if gemini_service and gemini_service._client:
            try:
                questions = await self._generate_with_gemini(gemini_service, request)
            except Exception as exc:
                logger.warning("Gemini quiz generation failed (%s); using fallback.", exc)

        if not questions:
            questions = self._generate_from_templates(request)

        quiz_id = str(uuid.uuid4())
        quiz = QuizResponse(
            quiz_id=quiz_id,
            lesson_id=request.lesson_id,
            questions=questions,
            generated_at=datetime.now(timezone.utc).isoformat(),
        )

        _quiz_store[quiz_id] = quiz
        _quiz_meta[quiz_id] = {
            "difficulty": request.difficulty,
            "subject": request.subject,
            "grade_level": request.grade_level,
        }

        return quiz

    # ------------------------------------------------------------------
    # Gemini path
    # ------------------------------------------------------------------

    async def _generate_with_gemini(
        self,
        gemini_service,
        request: QuizGenerateRequest,
    ) -> list[QuizQuestion]:
        tags_str = (
            ", ".join(request.misconception_tags)
            if request.misconception_tags
            else "general concepts"
        )
        student_age = 6 + request.grade_level

        prompt = f"""Generate {request.question_count} multiple-choice quiz questions about \
{request.subject} for grade {request.grade_level} students (age ~{student_age}).

Difficulty: {request.difficulty}
Misconceptions to target with trap distractors: {tags_str}

Return ONLY a valid JSON array — no markdown fences, no extra text:
[
  {{
    "question_text": "...",
    "correct_answer": "...",
    "distractors": [
      {{"text": "...", "misconception": "{request.misconception_tags[0] if request.misconception_tags else 'general'}"}},
      {{"text": "...", "misconception": "..."}},
      {{"text": "...", "misconception": "..."}}
    ],
    "explanation": "One sentence why the correct answer is right."
  }}
]

Rules:
- Use simple language suitable for age {student_age}
- Every distractor must be plausible but wrong
- misconception value should reference one of: {tags_str}
- Exactly 3 distractors per question
"""

        raw = await gemini_service._generate_content(prompt)
        if not raw:
            return []

        clean = raw.replace("```json", "").replace("```", "").strip()
        start = clean.find("[")
        end = clean.rfind("]") + 1
        if start == -1 or end == 0:
            logger.warning("Gemini returned no JSON array for quiz generation.")
            return []

        data: list[dict] = json.loads(clean[start:end])
        return self._parse_gemini_questions(data, request.difficulty)

    @staticmethod
    def _parse_gemini_questions(data: list[dict], difficulty: str) -> list[QuizQuestion]:
        letters = ["a", "b", "c", "d"]
        questions: list[QuizQuestion] = []

        for item in data:
            options = [
                QuizOption(
                    option_id="a",
                    option_text=item["correct_answer"],
                    is_distractor=False,
                    misconception_type=None,
                )
            ]
            for i, d in enumerate(item.get("distractors", [])[:3]):
                options.append(
                    QuizOption(
                        option_id=letters[i + 1],
                        option_text=d["text"],
                        is_distractor=True,
                        misconception_type=d.get("misconception"),
                    )
                )
            random.shuffle(options)
            questions.append(
                QuizQuestion(
                    question_id=str(uuid.uuid4()),
                    question_text=item["question_text"],
                    options=options,
                    difficulty=difficulty,
                )
            )

        return questions

    # ------------------------------------------------------------------
    # Deterministic fallback
    # ------------------------------------------------------------------

    @staticmethod
    def _generate_from_templates(request: QuizGenerateRequest) -> list[QuizQuestion]:
        tags = request.misconception_tags[: request.question_count]
        questions: list[QuizQuestion] = []

        for tag in tags:
            tmpl = MISCONCEPTION_TEMPLATES.get(tag)
            if not tmpl:
                continue

            options = [
                QuizOption(
                    option_id="a",
                    option_text=tmpl["correct"],
                    is_distractor=False,
                )
            ]
            for letter, (text, mc) in zip(["b", "c", "d"], tmpl["distractors"]):
                options.append(
                    QuizOption(
                        option_id=letter,
                        option_text=text,
                        is_distractor=True,
                        misconception_type=mc,
                    )
                )
            random.shuffle(options)

            questions.append(
                QuizQuestion(
                    question_id=str(uuid.uuid4()),
                    question_text=tmpl["question"],
                    options=options,
                    difficulty=request.difficulty,
                )
            )

        return questions

    # ------------------------------------------------------------------
    # Retrieve
    # ------------------------------------------------------------------

    def get_quiz(self, quiz_id: str) -> Optional[QuizResponse]:
        return _quiz_store.get(quiz_id)

    # ------------------------------------------------------------------
    # Submit & score
    # ------------------------------------------------------------------

    def submit(self, request: QuizSubmitRequest) -> QuizSubmitResponse:
        quiz = _quiz_store.get(request.quiz_id)
        if quiz is None:
            raise KeyError(f"Quiz '{request.quiz_id}' not found. It may have expired.")

        meta = _quiz_meta.get(request.quiz_id, {})
        difficulty = meta.get("difficulty", "medium")
        subject = meta.get("subject", "Mathematics")
        grade_level = meta.get("grade_level", 3)

        q_map = {q.question_id: q for q in quiz.questions}
        results: list[QuestionResult] = []
        misconceptions: list[str] = []

        for answer in request.answers:
            q = q_map.get(answer.question_id)
            if q is None:
                continue

            chosen = next(
                (o for o in q.options if o.option_id == answer.selected_option_id), None
            )
            correct_opt = next((o for o in q.options if not o.is_distractor), None)

            is_correct = chosen is not None and not chosen.is_distractor
            mc = chosen.misconception_type if (chosen and chosen.is_distractor) else None
            if mc:
                misconceptions.append(mc)

            results.append(
                QuestionResult(
                    question_id=answer.question_id,
                    question_text=q.question_text,
                    selected_option_id=answer.selected_option_id,
                    correct_option_id=correct_opt.option_id if correct_opt else "",
                    is_correct=is_correct,
                    misconception_triggered=mc,
                )
            )

        correct_count = sum(1 for r in results if r.is_correct)
        total = len(results)
        score = round(correct_count / total, 2) if total > 0 else 0.0
        passed = score >= PASS_THRESHOLD

        return QuizSubmitResponse(
            quiz_id=request.quiz_id,
            score=score,
            correct_count=correct_count,
            total_questions=total,
            passed=passed,
            pass_threshold=PASS_THRESHOLD,
            difficulty=difficulty,
            results=results,
            misconceptions_triggered=list(set(misconceptions)),
            rationale=_build_rationale(difficulty, score, subject, grade_level, misconceptions),
        )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_rationale(
    difficulty: str,
    score: float,
    subject: str,
    grade_level: int,
    misconceptions: list[str],
) -> str:
    lines = [
        f"This was a {difficulty}-difficulty {subject} quiz for grade {grade_level}."
    ]

    unique_mc = list(set(misconceptions))
    if unique_mc:
        lines.append(
            f"Questions targeted these misconceptions: {', '.join(unique_mc)}."
        )

    if score >= 0.8:
        lines.append("Excellent work! You're ready to move on.")
    elif score >= PASS_THRESHOLD:
        lines.append("Good job — you passed! Keep practicing to build confidence.")
    elif score >= 0.4:
        lines.append("You're making progress. Review the lesson and give it another try.")
    else:
        lines.append(
            "No worries — learning takes practice. Re-read the lesson and retake the quiz."
        )

    return " ".join(lines)


def _get_gemini():
    try:
        from app.services.gemini_service import get_gemini_service
        return get_gemini_service()
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------

_quiz_agent = QuizAgent()


def get_quiz_agent() -> QuizAgent:
    return _quiz_agent
