"""Attention scoring and drift detection logic integrated with Redis.

This adapts the standalone attention service into the main backend stack.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, asdict
from statistics import pstdev
from time import time
from typing import Dict, Tuple

from redis import Redis

from app.core.config import settings

logger = logging.getLogger(__name__)

ROLLING_K = 10
FEATURE_KEY_TEMPLATE = "attn:features:{user_id}:{session_id}"
DRIFT_KEY_TEMPLATE = "attn:drift:{user_id}:{session_id}"

_redis_client: Redis | None = None

events_processed_total = 0
drifts_detected_total = 0


def get_redis() -> Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client


def _clip(value: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, value))


@dataclass
class AttentionFeatures:
    lat_ms_norm: float = 0.0
    err_norm: float = 0.0
    idle_norm: float = 0.0
    var_norm: float = 0.0


def _load_feature_state(key: str) -> tuple[list[int], list[bool], float]:
    raw = get_redis().get(key)
    if not raw:
        return [], [], 0.0
    data = json.loads(raw)
    return (
        data.get("latencies", []),
        data.get("correct_flags", []),
        float(data.get("idle_ms", 0.0)),
    )


def _save_feature_state(
    key: str,
    latencies: list[int],
    correct_flags: list[bool],
    idle_ms: float,
) -> None:
    payload = {
        "latencies": latencies[-ROLLING_K:],
        "correct_flags": correct_flags[-ROLLING_K:],
        "idle_ms": idle_ms,
    }
    get_redis().set(key, json.dumps(payload))


def update_features_and_compute(
    user_id: str,
    session_id: str,
    latency_ms: int | None,
    is_correct: bool | None,
    idle_ms: int | None = None,
) -> AttentionFeatures:
    """Update rolling window features and return normalized feature vector."""
    key = FEATURE_KEY_TEMPLATE.format(user_id=user_id, session_id=session_id)
    latencies, correct_flags, idle_state_ms = _load_feature_state(key)

    # Use latency from answered questions
    if latency_ms is not None:
        latencies.append(int(latency_ms))
        if is_correct is not None:
            correct_flags.append(bool(is_correct))

    # Track most recent idle duration, if provided
    if idle_ms is not None:
        idle_state_ms = float(idle_ms)

    _save_feature_state(key, latencies, correct_flags, idle_state_ms)

    # Normalized latency: current latency if present, else mean
    if latency_ms is not None:
        lat_ms_norm = _clip(latency_ms / 3000.0)
    elif latencies:
        lat_ms_norm = _clip(sum(latencies) / (len(latencies) * 3000.0))
    else:
        lat_ms_norm = 0.0

    # Rolling error rate
    if correct_flags:
        errors = sum(1 for c in correct_flags if not c)
        err_rate = errors / len(correct_flags)
    else:
        err_rate = 0.0
    err_norm = _clip(err_rate)

    # Idle
    idle_norm = _clip(idle_state_ms / 5000.0)

    # Latency variability
    if len(latencies) >= 2:
        std_val = pstdev(latencies)
        var_norm = _clip(std_val / 3000.0)
    else:
        var_norm = 0.0

    return AttentionFeatures(
        lat_ms_norm=lat_ms_norm,
        err_norm=err_norm,
        idle_norm=idle_norm,
        var_norm=var_norm,
    )


def compute_attention_score(features: AttentionFeatures) -> Tuple[float, Dict]:
    """Combine normalized features into a 0–1 attention score."""
    # Simple, tunable weights
    w_lat = 0.35
    w_err = 0.35
    w_idle = 0.20
    w_var = 0.10

    risk = (
        w_lat * features.lat_ms_norm
        + w_err * features.err_norm
        + w_idle * features.idle_norm
        + w_var * features.var_norm
    )
    weight_sum = w_lat + w_err + w_idle + w_var
    if weight_sum > 0:
        risk = risk / weight_sum

    score = max(0.0, min(1.0, 1.0 - risk))
    details = asdict(features)
    details["risk"] = risk
    details["score"] = score
    logger.info(
        "attention_score_computed",
        extra={
            "lat_ms_norm": features.lat_ms_norm,
            "err_norm": features.err_norm,
            "idle_norm": features.idle_norm,
            "var_norm": features.var_norm,
            "risk": risk,
            "score": score,
        },
    )
    return score, details


def build_rationale(features: AttentionFeatures, score: float) -> str:
    """Human-readable rationale string for UI."""
    parts: list[str] = []
    if features.lat_ms_norm > 0.7:
        parts.append("Slow responses")
    elif features.lat_ms_norm < 0.3:
        parts.append("Stable, fast responses")

    if features.err_norm > 0.4:
        parts.append("repeated errors")
    elif features.err_norm < 0.1:
        parts.append("low errors")

    if features.idle_norm > 0.5:
        parts.append("frequent idle periods")

    if features.var_norm > 0.5:
        parts.append("variable reaction times")

    if not parts:
        if score >= 0.7:
            return "Stable latency; low errors"
        if score <= 0.3:
            return "Unstable focus indicators"
        return "Mixed attention indicators"

    if len(parts) == 1:
        return parts[0]
    if len(parts) == 2:
        return f"{parts[0]} and {parts[1]}"
    return ", ".join(parts[:-1]) + f", and {parts[-1]}"


def rationale_from_score(score: float) -> str:
    """Fallback rationale when only a scalar score is available."""
    if score >= 0.8:
        return "Stable latency; low errors"
    if score >= 0.6:
        return "Generally stable attention"
    if score >= 0.4:
        return "Mixed attention indicators"
    if score >= 0.2:
        return "Low attention indicators"
    return "Very low attention, likely drift"


@dataclass
class DriftState:
    ema: float = 1.0
    window_start_ema: float = 1.0
    window_start_ts: float = 0.0
    last_updated_ts: float = 0.0
    in_drift: bool = False


def _load_drift_state(key: str) -> DriftState:
    raw = get_redis().get(key)
    if not raw:
        return DriftState()
    data = json.loads(raw)
    return DriftState(
        ema=float(data.get("ema", 1.0)),
        window_start_ema=float(data.get("window_start_ema", 1.0)),
        window_start_ts=float(data.get("window_start_ts", 0.0)),
        last_updated_ts=float(data.get("last_updated_ts", 0.0)),
        in_drift=bool(data.get("in_drift", False)),
    )


def _save_drift_state(key: str, state: DriftState) -> None:
    get_redis().set(key, json.dumps(asdict(state)))


def evaluate_drift(user_id: str, session_id: str, score: float) -> Tuple[bool, str]:
    """EMA-based drift detection with hysteresis and simple trend check."""
    key = DRIFT_KEY_TEMPLATE.format(user_id=user_id, session_id=session_id)
    state = _load_drift_state(key)

    now_ts = time()
    alpha = 0.20
    ema_old = state.ema
    ema_new = alpha * score + (1.0 - alpha) * ema_old

    window_seconds = 60.0
    if state.window_start_ts == 0.0 or now_ts - state.window_start_ts > window_seconds:
        state.window_start_ts = now_ts
        state.window_start_ema = ema_new

    trend_drop = state.window_start_ema - ema_new
    drift = state.in_drift
    recommended_action = "continue"

    threshold_low = 0.40
    threshold_recover = 0.55
    trend_drop_min = 0.10

    global drifts_detected_total

    if not drift:
        if score < threshold_low and trend_drop >= trend_drop_min:
            drift = True
    else:
        if score > threshold_recover:
            drift = False

    state.ema = ema_new
    state.in_drift = drift
    state.last_updated_ts = now_ts

    _save_drift_state(key, state)

    if drift:
        drifts_detected_total += 1
        if score < 0.25:
            recommended_action = "break"
        else:
            recommended_action = "recap"
        logger.info(
            "attention_drift_detected",
            extra={
                "user_id": user_id,
                "session_id": session_id,
                "score": score,
                "ema": ema_new,
                "trend_drop": trend_drop,
                "recommended_action": recommended_action,
            },
        )

    return drift, recommended_action


def get_drift_status(user_id: str, session_id: str) -> Tuple[bool, str]:
    """Read-only view of current drift state."""
    key = DRIFT_KEY_TEMPLATE.format(user_id=user_id, session_id=session_id)
    state = _load_drift_state(key)
    if not state.in_drift:
        return False, "continue"
    if state.ema < 0.25:
        return True, "break"
    return True, "recap"

