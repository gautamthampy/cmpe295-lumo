import json
from typing import Any, Dict

import pytest

from app.services.attention_engine import (
    AttentionFeatures,
    compute_attention_score,
    evaluate_drift,
    get_redis,
)


class FakeRedis:
    def __init__(self) -> None:
        self._store: Dict[str, str] = {}

    def get(self, key: str) -> str | None:  # type: ignore[override]
        return self._store.get(key)

    def set(self, key: str, value: str, **kwargs: Any) -> None:  # type: ignore[override]
        """Mimic redis-py's set, ignoring TTL/extra kwargs for tests."""
        self._store[key] = value


@pytest.fixture(autouse=True)
def patch_redis(monkeypatch: pytest.MonkeyPatch) -> None:
    """Patch attention_engine.get_redis to use an in-memory fake Redis."""

    fake = FakeRedis()

    def _get_redis() -> FakeRedis:
        return fake

    monkeypatch.setattr("app.services.attention_engine.get_redis", _get_redis)


def test_attention_score_monotonicity_latency() -> None:
    """Higher latency should reduce the attention score."""
    low_latency = AttentionFeatures(lat_ms_norm=0.1, err_norm=0.0, idle_norm=0.0, var_norm=0.0)
    high_latency = AttentionFeatures(lat_ms_norm=0.9, err_norm=0.0, idle_norm=0.0, var_norm=0.0)

    low_score, _ = compute_attention_score(low_latency)
    high_score, _ = compute_attention_score(high_latency)

    assert low_score > high_score


def test_attention_score_monotonicity_error() -> None:
    """Higher error rate should reduce the attention score."""
    low_error = AttentionFeatures(lat_ms_norm=0.0, err_norm=0.1, idle_norm=0.0, var_norm=0.0)
    high_error = AttentionFeatures(lat_ms_norm=0.0, err_norm=0.9, idle_norm=0.0, var_norm=0.0)

    low_score, _ = compute_attention_score(low_error)
    high_score, _ = compute_attention_score(high_error)

    assert low_score > high_score


def test_attention_score_bounds() -> None:
    """Scores are always clamped to [0, 1]."""
    features = AttentionFeatures(lat_ms_norm=1.0, err_norm=1.0, idle_norm=1.0, var_norm=1.0)
    score, details = compute_attention_score(features)

    assert 0.0 <= score <= 1.0
    assert 0.0 <= details["score"] <= 1.0  # double-check detail payload


def test_drift_hysteresis_and_recommended_actions(monkeypatch: pytest.MonkeyPatch) -> None:
    """Drift should trigger only after sustained low scores and clear once recovered."""
    user_id = "user-1"
    session_id = "sess-1"

    # Start with good focus: no drift.
    drift, action = evaluate_drift(user_id, session_id, score=0.9)
    assert drift is False
    assert action == "continue"

    # Multiple very low scores should eventually enter drift and recommend a break.
    last_drift = False
    last_action: str | None = None
    for _ in range(6):
        drift, action = evaluate_drift(user_id, session_id, score=0.1)
        last_drift, last_action = drift, action

    assert last_drift is True
    assert last_action in {"break", "recap"}

    # A mildly low score during drift should still keep us in drift.
    drift, action = evaluate_drift(user_id, session_id, score=0.3)
    assert drift is True

    # Once the score recovers above the recovery threshold, drift should clear.
    drift, action = evaluate_drift(user_id, session_id, score=0.9)
    assert drift is False
    assert action == "continue"

