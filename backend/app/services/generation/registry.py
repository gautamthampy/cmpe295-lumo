"""Strategy registry — maps strategy names to classes."""
from __future__ import annotations

from typing import TYPE_CHECKING, Literal

from app.services.generation.base import LessonGenerationStrategy
from app.services.generation.bkt_strategy import BKTStrategy
from app.services.generation.hybrid_strategy import HybridStrategy
from app.services.generation.misconception_strategy import MisconceptionStrategy
from app.services.generation.zpd_strategy import ZPDStrategy

if TYPE_CHECKING:
    from app.services.gemini_service import GeminiService

StrategyName = Literal["zpd", "misconception", "bkt", "hybrid", "legacy"]

STRATEGY_REGISTRY: dict[str, type[LessonGenerationStrategy]] = {
    "zpd": ZPDStrategy,
    "misconception": MisconceptionStrategy,
    "bkt": BKTStrategy,
    "hybrid": HybridStrategy,
}


def get_strategy(name: StrategyName, gemini: "GeminiService") -> LessonGenerationStrategy:
    """Return an instantiated strategy by name."""
    cls = STRATEGY_REGISTRY.get(name)
    if not cls:
        raise ValueError(f"Unknown strategy: '{name}'. Valid options: {list(STRATEGY_REGISTRY)}")
    return cls(gemini)
