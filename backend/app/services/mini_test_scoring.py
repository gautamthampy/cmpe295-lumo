"""Map attention mini-test completion score to attention signal and recommended action."""
from __future__ import annotations


def mini_test_score_to_action(score: float) -> tuple[float, str]:
    """Return (attention_score, recommended_action) with action in continue|recap|break.

    Uses the same 0-1 scale as behavioral attention_score for dashboard compatibility.
    """
    s = max(0.0, min(1.0, float(score)))
    if s >= 0.75:
        return s, "continue"
    if s >= 0.45:
        return s, "recap"
    return s, "break"
