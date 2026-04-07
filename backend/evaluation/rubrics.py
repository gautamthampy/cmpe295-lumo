"""
Evaluation rubrics for comparative strategy analysis.

Each rubric is a function (mdx_content, context_dict) -> float in [0.0, 1.0].
Used by run_eval.py for offline evaluation and by the LLM judge.
"""
from __future__ import annotations

import re
import json
import logging
from dataclasses import dataclass
from typing import Callable

logger = logging.getLogger(__name__)


@dataclass
class Rubric:
    name: str
    description: str
    score_fn: Callable[[str, dict], float]


# ------------------------------------------------------------------
# Individual rubric implementations
# ------------------------------------------------------------------

def score_accessibility(mdx: str, ctx: dict) -> float:
    """Run the existing WCAG 2.1 AA checker on rendered HTML."""
    try:
        from app.services.mdx_renderer import get_renderer
        from app.services.accessibility_checker import get_checker
        html = get_renderer().render(mdx)
        result = get_checker().check(html, grade_level=ctx.get("grade_level", 3))
        return result.score
    except Exception as e:
        logger.warning(f"Accessibility rubric failed: {e}")
        return 0.0


def score_reading_level(mdx: str, ctx: dict) -> float:
    """
    Estimate Flesch-Kincaid grade level alignment.
    Target: grade_level ± 1.5. Returns 1.0 if aligned, decays linearly.
    """
    target_grade = ctx.get("grade_level", 3)
    # Strip markdown syntax for word/sentence analysis
    text = re.sub(r"<!--.*?-->", "", mdx, flags=re.DOTALL)
    text = re.sub(r"[#*`>\[\]()_~]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()

    words = text.split()
    sentences = [s for s in re.split(r"[.!?]+", text) if s.strip()]
    if not sentences or not words:
        return 0.5

    avg_words_per_sentence = len(words) / len(sentences)
    # Approximate syllable count: 1 syllable per vowel group
    syllables = sum(
        max(1, len(re.findall(r"[aeiouAEIOU]+", w))) for w in words
    )
    avg_syllables_per_word = syllables / len(words)

    # Flesch-Kincaid Grade Level formula
    fk_grade = 0.39 * avg_words_per_sentence + 11.8 * avg_syllables_per_word - 15.59
    fk_grade = max(0.0, fk_grade)

    deviation = abs(fk_grade - target_grade)
    if deviation <= 1.5:
        return 1.0
    if deviation <= 3.0:
        return 1.0 - (deviation - 1.5) / 1.5 * 0.5
    return max(0.0, 0.5 - (deviation - 3.0) * 0.1)


def score_misconception_coverage(mdx: str, ctx: dict) -> float:
    """Fraction of priority misconception tags mentioned in the generated content."""
    tags = ctx.get("misconception_tags", [])
    if not tags:
        return 1.0
    content_lower = mdx.lower()
    mentioned = sum(
        1 for tag in tags
        if tag.replace("-", " ").lower() in content_lower or tag.lower() in content_lower
    )
    return mentioned / len(tags)


def score_activity_count(mdx: str, ctx: dict) -> float:
    """
    Number of interactive activities present.
    Target: 2-4. Score = 1.0 for [2,4], decays outside that range.
    """
    count = len(re.findall(r"<!-- interactive -->", mdx))
    if 2 <= count <= 4:
        return 1.0
    if count == 1:
        return 0.5
    if count == 0:
        return 0.0
    if count == 5:
        return 0.8
    return max(0.0, 0.8 - (count - 5) * 0.2)


def score_scaffold_presence(mdx: str, ctx: dict) -> float:
    """
    If difficulty is 'scaffold', check for scaffold comment blocks.
    If 'advanced', check for advanced blocks. Otherwise returns 1.0.
    """
    difficulty = ctx.get("difficulty_level", "standard")
    if difficulty == "scaffold":
        has_scaffold = bool(re.search(r"<!-- scaffold -->", mdx))
        return 1.0 if has_scaffold else 0.0
    if difficulty == "advanced":
        has_advanced = bool(re.search(r"<!-- advanced -->", mdx))
        return 1.0 if has_advanced else 0.3
    return 1.0


def score_coherence_heuristic(mdx: str, ctx: dict) -> float:
    """
    Heuristic coherence check (no LLM call — for fast offline eval).
    Checks: heading structure, topic mention, key takeaway section.
    """
    score = 0.0
    # Has at least one ## heading
    if re.search(r"^## ", mdx, re.MULTILINE):
        score += 0.25
    # Topic mentioned in content
    topic = ctx.get("topic", "").lower()
    if topic and topic in mdx.lower():
        score += 0.25
    # Has a Key Takeaway section
    if re.search(r"## Key Takeaway", mdx, re.IGNORECASE):
        score += 0.25
    # Has bold terms (key vocabulary)
    if re.search(r"\*\*\w+\*\*", mdx):
        score += 0.25
    return score


# ------------------------------------------------------------------
# Rubric registry
# ------------------------------------------------------------------

RUBRICS: list[Rubric] = [
    Rubric(
        name="accessibility",
        description="WCAG 2.1 AA score via existing 10-rule checker",
        score_fn=score_accessibility,
    ),
    Rubric(
        name="reading_level",
        description="Flesch-Kincaid grade level alignment (target: grade ± 1.5)",
        score_fn=score_reading_level,
    ),
    Rubric(
        name="misconception_coverage",
        description="Fraction of priority misconception tags addressed in content",
        score_fn=score_misconception_coverage,
    ),
    Rubric(
        name="activity_count",
        description="Interactive activity count quality (target: 2-4)",
        score_fn=score_activity_count,
    ),
    Rubric(
        name="scaffold_presence",
        description="Presence of scaffold/advanced blocks when difficulty requires them",
        score_fn=score_scaffold_presence,
    ),
    Rubric(
        name="coherence",
        description="Heuristic coherence: headings, topic mention, key takeaway, bold terms",
        score_fn=score_coherence_heuristic,
    ),
]

RUBRIC_MAP = {r.name: r for r in RUBRICS}
