"""
Bayesian Knowledge Tracing (BKT) Generation Strategy.

Based on: CoTutor (arXiv:2509.23996) — Bayesian Knowledge Tracing enhanced
with signal processing for persistent student mastery modeling.

BKT Parameters (per knowledge component):
  P(L0) — prior probability of mastery
  P(T)  — probability of learning from one opportunity
  P(G)  — probability of guessing correctly without mastery
  P(S)  — probability of slipping (error despite mastery)

Algorithm:
1. Load mastery_scores from context (already fetched from learner.mastery_scores)
2. Run BKT update equations for each knowledge component
3. Find KCs with P(mastery) < threshold (0.6)
4. Generate content targeting the weakest 2-3 knowledge components
"""
import logging

from app.services.generation.base import (
    GenerationContext,
    GenerationResult,
    LessonGenerationStrategy,
)

logger = logging.getLogger(__name__)

# Standard BKT parameter defaults (literature-derived for elementary students)
_BKT_PARAMS = {
    "p_learn": 0.30,   # P(T) — transit probability
    "p_guess": 0.25,   # P(G)
    "p_slip": 0.10,    # P(S)
    "p_prior": 0.40,   # P(L0)
}

_MASTERY_THRESHOLD = 0.60
_MAX_WEAK_COMPONENTS = 3


class BKTStrategy(LessonGenerationStrategy):
    strategy_name = "bkt"

    async def generate(self, ctx: GenerationContext) -> GenerationResult:
        weak_components = self._find_weak_components(ctx)
        prompt = self._build_prompt(ctx, weak_components)
        mdx = await self.gemini._generate_content(prompt)
        if not mdx.strip():
            mdx = self._stub(ctx, weak_components)
        return GenerationResult(
            strategy="bkt",
            mdx_content=mdx,
            misconception_tags=[kc["tag"] for kc in weak_components],
            difficulty_level="standard",
            metadata={
                "weak_components": weak_components,
                "bkt_params": _BKT_PARAMS,
                "mastery_threshold": _MASTERY_THRESHOLD,
            },
        )

    def _find_weak_components(self, ctx: GenerationContext) -> list[dict]:
        """
        Return the weakest knowledge components sorted by P(mastery) ascending.
        If mastery_scores is empty, treats all misconception_tags as weak (P=prior).
        """
        if not ctx.mastery_scores:
            # No history — all tags are at prior probability
            return [
                {"tag": tag, "p_mastery": _BKT_PARAMS["p_prior"]}
                for tag in ctx.misconception_tags[:_MAX_WEAK_COMPONENTS]
            ]

        components = [
            {"tag": tag, "p_mastery": score}
            for tag, score in ctx.mastery_scores.items()
            if score < _MASTERY_THRESHOLD
        ]
        components.sort(key=lambda c: c["p_mastery"])
        return components[:_MAX_WEAK_COMPONENTS]

    def bkt_update(self, prior: float, correct: bool) -> float:
        """
        Standard BKT posterior update.
        P(L_n | correct)   = P(L)*( 1-P(S)) / [P(L)*(1-P(S)) + (1-P(L))*P(G)]
        P(L_n | incorrect) = P(L)*P(S)      / [P(L)*P(S)     + (1-P(L))*(1-P(G))]
        P(L_n+1) = posterior + (1 - posterior) * P(T)
        """
        p_l = prior
        p_g = _BKT_PARAMS["p_guess"]
        p_s = _BKT_PARAMS["p_slip"]
        p_t = _BKT_PARAMS["p_learn"]

        if correct:
            posterior = (p_l * (1 - p_s)) / (p_l * (1 - p_s) + (1 - p_l) * p_g)
        else:
            posterior = (p_l * p_s) / (p_l * p_s + (1 - p_l) * (1 - p_g))

        return posterior + (1 - posterior) * p_t

    def _build_prompt(self, ctx: GenerationContext, weak_components: list[dict]) -> str:
        if weak_components:
            kc_lines = "\n".join(
                f"- **{kc['tag']}** (current mastery: {kc['p_mastery']:.0%})"
                for kc in weak_components
            )
            focus_block = f"""
KNOWLEDGE TRACING FOCUS:
The following knowledge components have low mastery and need targeted practice:
{kc_lines}

Build the lesson around these specific gaps. Include 1 interactive activity per component.
Order from lowest to highest mastery so the student builds confidence progressively.
"""
        else:
            focus_block = "No specific mastery gaps detected. Provide a well-rounded introduction."

        return f"""Write a micro-lesson in Markdown (MDX-compatible) about "{ctx.topic}" for Grade {ctx.grade_level} {ctx.subject_name} students.

TEACHING APPROACH: Knowledge-Gap Targeting (Bayesian Knowledge Tracing)
{focus_block}

{self._base_mdx_requirements(ctx)}
{self._interactive_spec()}

Output ONLY the Markdown content. No preamble or explanation.
"""

    def _stub(self, ctx: GenerationContext, weak_components: list[dict]) -> str:
        focus = (
            f" focusing on {', '.join(kc['tag'] for kc in weak_components)}"
            if weak_components
            else ""
        )
        return f"""## What Is {ctx.topic}?

**{ctx.topic}** is a key skill{focus}. Let's build your understanding step by step.

## Practice

Work through each concept and check your understanding with the activities.

## Key Takeaway

Every practice session helps your brain get stronger at {ctx.topic}!
"""
