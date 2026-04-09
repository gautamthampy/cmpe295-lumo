"""
Misconception-Driven Generation Strategy.

Based on: "A Benchmark for Math Misconceptions" (Springer 2025) and
structured misconception taxonomy research.

Algorithm:
1. Prioritise tags from ctx.recent_errors (most recently triggered mistakes)
2. Fall back to ctx.misconception_tags if no recent errors
3. Build a Socratic "confrontation prompt": show common wrong answer, explain why it fails
4. Generate activities that specifically probe for each priority misconception
"""
import logging

from app.services.generation.base import (
    GenerationContext,
    GenerationResult,
    LessonGenerationStrategy,
)

logger = logging.getLogger(__name__)

_MAX_PRIORITY_TAGS = 3


class MisconceptionStrategy(LessonGenerationStrategy):
    strategy_name = "misconception"

    async def generate(self, ctx: GenerationContext) -> GenerationResult:
        priority_tags = self._prioritize_tags(ctx)
        prompt = self._build_prompt(ctx, priority_tags)
        mdx = await self.gemini._generate_content(prompt)
        if not mdx.strip():
            mdx = self._stub(ctx, priority_tags)
        return GenerationResult(
            strategy="misconception",
            mdx_content=mdx,
            misconception_tags=priority_tags,
            difficulty_level="standard",
            metadata={
                "targeted_tags": priority_tags,
                "source": "recent_errors" if ctx.recent_errors else "taxonomy",
                "confrontation_count": len(priority_tags),
            },
        )

    def _prioritize_tags(self, ctx: GenerationContext) -> list[str]:
        """Recent errors take priority; fall back to taxonomy tags."""
        if ctx.recent_errors:
            # Deduplicate while preserving order
            seen: set[str] = set()
            tags = []
            for t in ctx.recent_errors:
                if t not in seen:
                    seen.add(t)
                    tags.append(t)
            return tags[:_MAX_PRIORITY_TAGS]
        return ctx.misconception_tags[:_MAX_PRIORITY_TAGS]

    def _build_prompt(self, ctx: GenerationContext, priority_tags: list[str]) -> str:
        if priority_tags:
            tags_block = "\n".join(
                f"- Misconception: **{tag}** — Address this directly using the confrontation strategy"
                for tag in priority_tags
            )
            confrontation = f"""
MISCONCEPTION-FIRST APPROACH:
For each misconception below, use the Socratic confrontation strategy:
1. Show the common WRONG answer a student might give (labelled "Common mistake:")
2. Explain WHY it is wrong in simple terms
3. Show the CORRECT approach step by step

Target misconceptions:
{tags_block}

Each interactive activity must probe for one of these specific misconceptions.
Activities should include distractors that map to the misconception (so we can detect it).
"""
        else:
            confrontation = "Focus on common errors students make when learning this topic."

        return f"""Write a micro-lesson in Markdown (MDX-compatible) about "{ctx.topic}" for Grade {ctx.grade_level} {ctx.subject_name} students.

TEACHING APPROACH: Misconception-Driven (Confrontation Strategy)
{confrontation}

{self._base_mdx_requirements(ctx)}
{self._interactive_spec()}

Output ONLY the Markdown content. No preamble or explanation.
"""

    def _stub(self, ctx: GenerationContext, priority_tags: list[str]) -> str:
        tag_line = f" (especially: {', '.join(priority_tags)})" if priority_tags else ""
        return f"""## What Is {ctx.topic}?

**{ctx.topic}** is something many students find tricky{tag_line}.
Let's look at some common mistakes and how to avoid them.

## Common Mistake

Many students think... but actually the correct way is...

## Key Takeaway

Understanding {ctx.topic} takes practice — you've got this!
"""
