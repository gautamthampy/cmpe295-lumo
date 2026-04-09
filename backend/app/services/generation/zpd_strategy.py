"""
ZPD-Based Adaptive Scaffolding Strategy.

Based on: "A Theory of Adaptive Scaffolding for LLM-Based Pedagogical Agents"
arXiv:2508.01503 — Evidence-Centered Design + Vygotsky's Zone of Proximal Development.

Algorithm:
1. Estimate ZPD bounds from mastery_scores (independent vs. supported achievement)
2. Select difficulty band: scaffold | standard | advanced
3. Build a prompt with ECD task model variables and scaffold/advanced comment blocks
4. Scaffolds diminish as competence increases (encoded in <!-- scaffold --> blocks)
"""
import logging
from typing import Optional

from app.services.generation.base import (
    GenerationContext,
    GenerationResult,
    LessonGenerationStrategy,
)

logger = logging.getLogger(__name__)

_SCAFFOLD_BANDWIDTH = 0.25  # ZPD window width


class ZPDStrategy(LessonGenerationStrategy):
    strategy_name = "zpd"

    async def generate(self, ctx: GenerationContext) -> GenerationResult:
        difficulty = self._estimate_difficulty(ctx)
        prompt = self._build_prompt(ctx, difficulty)
        mdx = await self.gemini._generate_content(prompt)
        if not mdx.strip():
            mdx = self._stub(ctx, difficulty)
        return GenerationResult(
            strategy="zpd",
            mdx_content=mdx,
            misconception_tags=ctx.misconception_tags,
            difficulty_level=difficulty,
            metadata={
                "zpd_lower": ctx.zpd_lower,
                "zpd_upper": ctx.zpd_upper,
                "scaffold_bandwidth": _SCAFFOLD_BANDWIDTH,
                "estimated_difficulty": difficulty,
            },
        )

    def _estimate_difficulty(self, ctx: GenerationContext) -> str:
        if not ctx.mastery_scores:
            return "standard"
        avg = sum(ctx.mastery_scores.values()) / len(ctx.mastery_scores)
        if avg < 0.4:
            return "scaffold"
        if avg > 0.75:
            return "advanced"
        return "standard"

    def _build_prompt(self, ctx: GenerationContext, difficulty: str) -> str:
        tags_str = ", ".join(ctx.misconception_tags) if ctx.misconception_tags else "none"
        zpd_desc = (
            f"The student's estimated mastery is {ctx.zpd_lower:.0%}–{ctx.zpd_upper:.0%}. "
            f"Target content at the upper edge of their Zone of Proximal Development."
        )

        scaffold_instruction = ""
        if difficulty == "scaffold":
            scaffold_instruction = """
SCAFFOLDING REQUIRED: Wrap simplified explanations in scaffold comment blocks:
<!-- scaffold -->
<simplified explanation or worked example here>
<!-- /scaffold -->
Include at least 2 scaffold blocks. These help struggling students.
"""
        elif difficulty == "advanced":
            scaffold_instruction = """
ADVANCED CONTENT: Include extension challenges in advanced blocks:
<!-- advanced -->
<enrichment challenge or deeper explanation here>
<!-- /advanced -->
Include at least 1 advanced block for students who have mastered the basics.
"""

        return f"""Write a micro-lesson in Markdown (MDX-compatible) about "{ctx.topic}" for Grade {ctx.grade_level} {ctx.subject_name} students.

ZPD CONTEXT: {zpd_desc}
DIFFICULTY LEVEL: {difficulty.upper()}
MISCONCEPTION TAGS: {tags_str}

{self._base_mdx_requirements(ctx)}
{scaffold_instruction}
{self._interactive_spec()}

Evidence-Centered Design task model for this lesson:
- Evidence Rule: Student can correctly apply {ctx.topic} concepts without prompting
- Task Model Variables: scaffold blocks {('ON' if difficulty == 'scaffold' else 'OFF')}, advanced extensions {('ON' if difficulty == 'advanced' else 'OFF')}
- Each interactive activity should probe for one of the misconception tags listed above

Output ONLY the Markdown content. No preamble or explanation.
"""

    def _stub(self, ctx: GenerationContext, difficulty: str) -> str:
        scaffold_block = ""
        if difficulty == "scaffold":
            scaffold_block = f"""
<!-- scaffold -->
Let's break this down step by step. First, think about what you already know about {ctx.topic}...
<!-- /scaffold -->
"""
        return f"""## What Is {ctx.topic}?

**{ctx.topic}** is an important concept in {ctx.subject_name}.
{scaffold_block}
## Key Ideas

- Practice one step at a time
- Use examples to build confidence

## Key Takeaway

You are making great progress learning {ctx.topic}!
"""
