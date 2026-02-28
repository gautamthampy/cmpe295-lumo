"""
Mock quiz and analytics endpoints for Phase 2 PoC.

Provides deterministic quiz generation (no LLM) based on misconception
tags, allowing the full lesson → quiz flow to be demoed without Gemini.
"""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

# ------------------------------------------------------------------
# Misconception-based question templates
# Each entry: question text + correct answer + 3 distractors with tags
# ------------------------------------------------------------------
MISCONCEPTION_TEMPLATES: dict[str, dict] = {
    # Fractions
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
        "question": "A pizza is cut into 8 equal slices. You eat 3 slices. What fraction did you eat?",
        "correct": "3/8",
        "distractors": [
            ("8/3", "whole-vs-part"),
            ("5/8", "whole-vs-part"),
            ("3/5", "denominator-confusion"),
        ],
    },
    # Multiplication
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
    # Telling Time
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
    # Measurement
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
    # Division
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


class MockQuizRequest(BaseModel):
    lesson_id: str
    user_id: str
    misconception_tags: list[str]


class MockEventRequest(BaseModel):
    event_type: str
    user_id: str
    session_id: str
    event_data: dict = {}


def _make_option(letter: str, text: str, is_correct: bool, misconception: str | None = None):
    return {
        "option_id": letter,
        "option_text": text,
        "is_distractor": not is_correct,
        "misconception_type": misconception if not is_correct else None,
    }


@router.post("/generate")
async def generate_mock_quiz(request: MockQuizRequest):
    """
    Deterministic quiz generation from misconception tags.
    Returns up to 3 questions — one per misconception tag (capped at 3).
    """
    import random

    tags = request.misconception_tags[:3]  # max 3 questions
    questions = []

    for tag in tags:
        template = MISCONCEPTION_TEMPLATES.get(tag)
        if not template:
            continue

        options = [_make_option("a", template["correct"], is_correct=True)]
        letters = ["b", "c", "d"]
        for letter, (distractor_text, misconception_type) in zip(letters, template["distractors"]):
            options.append(_make_option(letter, distractor_text, is_correct=False, misconception=misconception_type))

        random.shuffle(options)

        questions.append({
            "question_id": str(uuid.uuid4()),
            "question_text": template["question"],
            "options": options,
            "difficulty": "medium",
        })

    return {
        "quiz_id": str(uuid.uuid4()),
        "lesson_id": request.lesson_id,
        "questions": questions,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@router.post("/events")
async def mock_ingest_event(request: MockEventRequest):
    """Mock event ingestion — logs and acknowledges events."""
    print(
        f"[EVENT] {request.event_type} | user={request.user_id} "
        f"| session={request.session_id} | data={request.event_data}"
    )
    return {"status": "accepted", "event_type": request.event_type}
