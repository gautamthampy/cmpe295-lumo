"""
Pydantic v2 schemas for interactive lesson activity blocks.

Activities are embedded in MDX content using HTML comment delimiters:

    <!-- interactive -->
    {"type":"FillInBlank","id":"act-1","instruction":"Complete the equation",
     "misconception_tag":"zero-property-error","difficulty":"standard",
     "data":{"prompt":"3 x 0 = ___","answer":"0","hint":"Any number times zero equals zero."}}
    <!-- /interactive -->

Ten activity types are supported across all subjects (universal) and
subject-specific (Math, English/Reading).
"""
import json
from typing import Any, Literal, Optional, Union
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Per-type data payloads
# ---------------------------------------------------------------------------

class FillInBlankData(BaseModel):
    prompt: str = Field(..., description="Sentence with ___ marking the blank(s)")
    answer: str = Field(..., description="Correct text for the blank")
    hint: Optional[str] = None


class TrueOrFalseData(BaseModel):
    statement: str
    correct: bool
    explanation: str = Field(..., description="Shown after student answers")


class MultipleChoiceOption(BaseModel):
    id: str
    text: str


class MultipleChoiceData(BaseModel):
    question: str
    options: list[MultipleChoiceOption] = Field(..., min_length=2, max_length=6)
    correct_id: str


class DragToSortData(BaseModel):
    items: list[str] = Field(..., description="Items in shuffled order shown to student")
    correct_order: list[str] = Field(..., description="Correct sequence of items")
    label: Optional[str] = None


class MatchPair(BaseModel):
    left: str
    right: str


class MatchPairsData(BaseModel):
    pairs: list[MatchPair] = Field(..., min_length=2, max_length=8)


class CategorySortCategory(BaseModel):
    name: str
    items: list[str]


class CategorySortData(BaseModel):
    categories: list[CategorySortCategory] = Field(..., min_length=2, max_length=4,
        description="Each category has a name and its correct items")
    prompt: Optional[str] = None


class WordBankData(BaseModel):
    passage: str = Field(..., description="Text with ___ marking each blank")
    bank: list[str] = Field(..., description="All available words (includes distractors)")
    answers: list[str] = Field(..., description="Correct word for each blank, in order")


class NumberLineData(BaseModel):
    min: float = 0.0
    max: float = 1.0
    divisions: int = Field(..., ge=2, le=20, description="Number of equal segments")
    target: float = Field(..., description="Correct position to place the marker")
    label: Optional[str] = None


class CountingGridData(BaseModel):
    rows: int = Field(..., ge=1, le=10)
    cols: int = Field(..., ge=1, le=10)
    target_count: int = Field(..., description="Number of cells to select")
    prompt: str


class HighlightTextData(BaseModel):
    passage: str = Field(..., description="The text passage shown to the student")
    targets: list[str] = Field(..., description="Exact words/phrases to highlight")
    prompt: str = Field(..., description="Instruction, e.g. 'Highlight all adjectives'")


# ---------------------------------------------------------------------------
# Activity models (discriminated union on `type`)
# ---------------------------------------------------------------------------

class FillInBlankActivity(BaseModel):
    type: Literal["FillInBlank"]
    id: str
    instruction: str
    misconception_tag: Optional[str] = None
    difficulty: Literal["scaffold", "standard", "advanced"] = "standard"
    data: FillInBlankData


class TrueOrFalseActivity(BaseModel):
    type: Literal["TrueOrFalse"]
    id: str
    instruction: str
    misconception_tag: Optional[str] = None
    difficulty: Literal["scaffold", "standard", "advanced"] = "standard"
    data: TrueOrFalseData


class MultipleChoiceActivity(BaseModel):
    type: Literal["MultipleChoice"]
    id: str
    instruction: str
    misconception_tag: Optional[str] = None
    difficulty: Literal["scaffold", "standard", "advanced"] = "standard"
    data: MultipleChoiceData


class DragToSortActivity(BaseModel):
    type: Literal["DragToSort"]
    id: str
    instruction: str
    misconception_tag: Optional[str] = None
    difficulty: Literal["scaffold", "standard", "advanced"] = "standard"
    data: DragToSortData


class MatchPairsActivity(BaseModel):
    type: Literal["MatchPairs"]
    id: str
    instruction: str
    misconception_tag: Optional[str] = None
    difficulty: Literal["scaffold", "standard", "advanced"] = "standard"
    data: MatchPairsData


class CategorySortActivity(BaseModel):
    type: Literal["CategorySort"]
    id: str
    instruction: str
    misconception_tag: Optional[str] = None
    difficulty: Literal["scaffold", "standard", "advanced"] = "standard"
    data: CategorySortData


class WordBankActivity(BaseModel):
    type: Literal["WordBank"]
    id: str
    instruction: str
    misconception_tag: Optional[str] = None
    difficulty: Literal["scaffold", "standard", "advanced"] = "standard"
    data: WordBankData


class NumberLineActivity(BaseModel):
    type: Literal["NumberLine"]
    id: str
    instruction: str
    misconception_tag: Optional[str] = None
    difficulty: Literal["scaffold", "standard", "advanced"] = "standard"
    data: NumberLineData


class CountingGridActivity(BaseModel):
    type: Literal["CountingGrid"]
    id: str
    instruction: str
    misconception_tag: Optional[str] = None
    difficulty: Literal["scaffold", "standard", "advanced"] = "standard"
    data: CountingGridData


class HighlightTextActivity(BaseModel):
    type: Literal["HighlightText"]
    id: str
    instruction: str
    misconception_tag: Optional[str] = None
    difficulty: Literal["scaffold", "standard", "advanced"] = "standard"
    data: HighlightTextData


InteractiveActivity = Union[
    FillInBlankActivity,
    TrueOrFalseActivity,
    MultipleChoiceActivity,
    DragToSortActivity,
    MatchPairsActivity,
    CategorySortActivity,
    WordBankActivity,
    NumberLineActivity,
    CountingGridActivity,
    HighlightTextActivity,
]

_TYPE_MAP: dict[str, Any] = {
    "FillInBlank": FillInBlankActivity,
    "TrueOrFalse": TrueOrFalseActivity,
    "MultipleChoice": MultipleChoiceActivity,
    "DragToSort": DragToSortActivity,
    "MatchPairs": MatchPairsActivity,
    "CategorySort": CategorySortActivity,
    "WordBank": WordBankActivity,
    "NumberLine": NumberLineActivity,
    "CountingGrid": CountingGridActivity,
    "HighlightText": HighlightTextActivity,
}


def validate_interactive_block(json_str: str) -> Optional[dict]:
    """
    Parse and validate a JSON string as an InteractiveActivity.
    Returns the validated dict, or None if validation fails.
    Raises ValueError with a descriptive message on hard failures.
    """
    try:
        raw = json.loads(json_str.strip())
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in interactive block: {e}") from e

    activity_type = raw.get("type")
    if activity_type not in _TYPE_MAP:
        raise ValueError(
            f"Unknown activity type '{activity_type}'. "
            f"Valid types: {', '.join(_TYPE_MAP.keys())}"
        )

    model_cls = _TYPE_MAP[activity_type]
    activity = model_cls.model_validate(raw)
    return activity.model_dump()
