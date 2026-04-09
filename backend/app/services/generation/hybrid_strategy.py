"""
Hybrid Generation Strategy.

Combines the best signals from all three strategies:
- ZPD for difficulty banding (scaffold / standard / advanced)
- BKT for topic/component selection (weakest knowledge components)
- Misconception for activity construction (confrontation approach)

Single composite LLM prompt — no extra API calls.
"""
import logging

from app.services.generation.base import (
    GenerationContext,
    GenerationResult,
    LessonGenerationStrategy,
)
from app.services.generation.bkt_strategy import BKTStrategy, _MASTERY_THRESHOLD
from app.services.generation.misconception_strategy import MisconceptionStrategy, _MAX_PRIORITY_TAGS
from app.services.generation.zpd_strategy import ZPDStrategy

logger = logging.getLogger(__name__)


class HybridStrategy(LessonGenerationStrategy):
    """
    Unified strategy that fuses ZPD, BKT, and Misconception signals into one prompt.

    Weighting heuristics:
    - recent_errors non-empty → misconception signal weighted higher
    - mastery_scores variance high → BKT gap-targeting dominant
    - ZPD difficulty banding always applies
    """

    strategy_name = "hybrid"

    def __init__(self, gemini):
        super().__init__(gemini)
        self._zpd = ZPDStrategy(gemini)
        self._bkt = BKTStrategy(gemini)
        self._misconception = MisconceptionStrategy(gemini)

    async def generate(self, ctx: GenerationContext) -> GenerationResult:
        # Gather signals from all three strategies (no LLM calls — just analysis)
        difficulty = self._zpd._estimate_difficulty(ctx)
        weak_components = self._bkt._find_weak_components(ctx)
        priority_tags = self._misconception._prioritize_tags(ctx)

        prompt = self._build_composite_prompt(ctx, difficulty, weak_components, priority_tags)
        mdx = await self.gemini._generate_content(prompt)
        if not mdx.strip():
            mdx = self._stub(ctx, difficulty)

        all_tags = list(dict.fromkeys(priority_tags + [kc["tag"] for kc in weak_components]))

        return GenerationResult(
            strategy="hybrid",
            mdx_content=mdx,
            misconception_tags=all_tags,
            difficulty_level=difficulty,
            metadata={
                "zpd_difficulty": difficulty,
                "bkt_weak_components": weak_components,
                "misconception_priority_tags": priority_tags,
                "signals_used": ["zpd", "bkt", "misconception"],
            },
        )

    def _build_composite_prompt(
        self,
        ctx: GenerationContext,
        difficulty: str,
        weak_components: list[dict],
        priority_tags: list[str],
    ) -> str:
        # --- ZPD signal ---
        zpd_block = f"""ZPD SIGNAL (Difficulty Calibration):
Estimated mastery range: {ctx.zpd_lower:.0%}–{ctx.zpd_upper:.0%}.
Difficulty level: {difficulty.upper()}.
{"Include <!-- scaffold --> blocks for key explanations." if difficulty == "scaffold" else ""}
{"Include <!-- advanced --> blocks for extension challenges." if difficulty == "advanced" else ""}
"""

        # --- BKT signal ---
        if weak_components:
            kc_lines = "\n".join(
                f"  - {kc['tag']} (mastery: {kc['p_mastery']:.0%})"
                for kc in weak_components
            )
            bkt_block = f"""BKT SIGNAL (Knowledge Gaps):
Focus on these low-mastery knowledge components:
{kc_lines}
Order lesson content from easiest gap to hardest.
"""
        else:
            bkt_block = "BKT SIGNAL: No significant mastery gaps. Provide balanced coverage.\n"

        # --- Misconception signal ---
        if priority_tags:
            mc_lines = "\n".join(
                f"  - {tag}: show the common error, then explain the correct approach"
                for tag in priority_tags
            )
            mc_block = f"""MISCONCEPTION SIGNAL (Confrontation Strategy):
Address these common errors using the Socratic confrontation approach:
{mc_lines}
For each: label the wrong answer "Common mistake:", then give the correct reasoning.
"""
        else:
            mc_block = "MISCONCEPTION SIGNAL: No specific misconceptions to target.\n"

        scaffold_inst = ""
        if difficulty == "scaffold":
            scaffold_inst = "\nWrap simplified explanations in <!-- scaffold --> ... <!-- /scaffold --> blocks.\n"
        elif difficulty == "advanced":
            scaffold_inst = "\nWrap enrichment content in <!-- advanced --> ... <!-- /advanced --> blocks.\n"

        return f"""Write a micro-lesson in Markdown (MDX-compatible) about "{ctx.topic}" for Grade {ctx.grade_level} {ctx.subject_name} students.

TEACHING APPROACH: Hybrid AI Strategy (ZPD + BKT + Misconception)
———————————————————————————
{zpd_block}
{bkt_block}
{mc_block}
———————————————————————————

{self._base_mdx_requirements(ctx)}
{scaffold_inst}
{self._interactive_spec()}

Combine all three signals naturally — the lesson should flow smoothly, not feel like three separate sections.
Output ONLY the Markdown content. No preamble or explanation.
"""

    def _stub(self, ctx: GenerationContext, difficulty: str) -> str:
        return f"""## What Is {ctx.topic}?

**{ctx.topic}** is a key concept in {ctx.subject_name} for Grade {ctx.grade_level} students.
We'll explore it step by step, starting with what you already know.

## Let's Explore

Learning {ctx.topic} involves understanding the core ideas and practising them.

## Key Takeaway

You're doing great! Each activity helps you get better at {ctx.topic}.
"""
