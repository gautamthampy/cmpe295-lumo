"""
Base classes and data structures for the lesson generation strategy pattern.

All four strategies (ZPD, Misconception, BKT, Hybrid) inherit from
LessonGenerationStrategy and produce a GenerationResult from a GenerationContext.
"""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Optional
from uuid import UUID

if TYPE_CHECKING:
    from app.services.gemini_service import GeminiService

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Interactive activity schema spec (moved here from gemini_service.py)
# ---------------------------------------------------------------------------

INTERACTIVE_SCHEMA_SPEC = """
You may include 2-3 interactive activities inline within the lesson using this format:

<!-- interactive -->
{JSON object — see schemas below}
<!-- /interactive -->

Place each activity on its own paragraph (blank line before and after).

ACTIVITY SCHEMAS (choose the type that fits best for the subject):

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

6. NumberLine (Math only — place a value on a number line)
{"type":"NumberLine","id":"act-6","instruction":"<text>",
 "misconception_tag":"<tag or null>","difficulty":"standard",
 "data":{"min":0,"max":1,"divisions":4,"target":0.75}}

7. WordBank (English/literacy — drag words into blanks)
{"type":"WordBank","id":"act-7","instruction":"<text>",
 "misconception_tag":"<tag or null>","difficulty":"standard",
 "data":{"sentence":"<sentence with [BLANK] placeholders>","bank":["word1","word2","word3"],"answers":["word1","word2"]}}

RULES:
- Valid JSON only (no trailing commas, no comments inside JSON)
- Unique ids: act-1, act-2, act-3
- instruction must be simple English for 8-9 year olds
- misconception_tag must be one of the lesson misconception tags, or null
- Place activities inside a section after explanatory text, never at the document start/end
"""


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class GenerationContext:
    """Everything a strategy needs to generate a personalised lesson."""
    topic: str
    subject_name: str
    grade_level: int
    student_id: Optional[UUID] = None
    misconception_tags: list[str] = field(default_factory=list)
    mastery_scores: dict[str, float] = field(default_factory=dict)
    recent_errors: list[str] = field(default_factory=list)
    zpd_lower: float = 0.4
    zpd_upper: float = 0.65


@dataclass
class GenerationResult:
    """Standardised output from any generation strategy."""
    strategy: str
    mdx_content: str
    misconception_tags: list[str]
    difficulty_level: str  # "scaffold" | "standard" | "advanced"
    metadata: dict = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Abstract base
# ---------------------------------------------------------------------------

class LessonGenerationStrategy(ABC):
    """
    All generation strategies must implement generate().
    They receive a fully-populated GenerationContext and return a GenerationResult.
    The LLM call is made via self.gemini._generate_content(prompt).
    """

    strategy_name: str = "base"

    def __init__(self, gemini: "GeminiService"):
        self.gemini = gemini

    @abstractmethod
    async def generate(self, ctx: GenerationContext) -> GenerationResult:
        ...

    def _interactive_spec(self) -> str:
        return INTERACTIVE_SCHEMA_SPEC

    def _base_mdx_requirements(self, ctx: GenerationContext) -> str:
        return f"""Requirements:
- Use ## for section headings (3-4 sections)
- Keep total word count between 200 and 400 words (excluding interactive blocks)
- Use **bold** for key terms on first use
- Start with "## What Is {ctx.topic}?" section
- End with "## Key Takeaway" section (2-3 sentences)
- Language must be simple and encouraging for {ctx.grade_level + 5}-year-old students
- Do NOT include JSX, import statements, or raw HTML tags
- Subject: {ctx.subject_name}, Grade: {ctx.grade_level}"""
