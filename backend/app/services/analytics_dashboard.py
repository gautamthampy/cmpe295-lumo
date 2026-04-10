"""Dashboard aggregates: mastery %, time per curriculum module, attention summary."""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.attention import AttentionMetric
from app.models.catalog import CurriculumLesson, CurriculumModule
from app.models.events import UserEvent
from app.models.learner_mastery import LearnerMasteryScore


def _extract_nested_event_data(event_data: dict) -> dict:
    if not event_data:
        return {}
    inner = event_data.get("data")
    if isinstance(inner, dict):
        return inner
    return event_data


def _extract_time_spent_ms(event_data: dict) -> int | None:
    inner = _extract_nested_event_data(event_data)
    raw = inner.get("time_spent_ms")
    if raw is None and isinstance(event_data, dict):
        raw = event_data.get("time_spent_ms")
    if raw is None:
        return None
    try:
        v = int(raw)
        return max(0, v)
    except (TypeError, ValueError):
        return None


def _extract_lesson_external_id(event_data: dict) -> str | None:
    inner = _extract_nested_event_data(event_data)
    lid = inner.get("lesson_id")
    if lid is None and isinstance(event_data, dict):
        lid = event_data.get("lesson_id")
    if lid is None:
        return None
    s = str(lid).strip()
    return s or None


def build_dashboard_payload(db: Session, user_id: UUID) -> dict:
    lessons_completed = (
        db.query(func.count(UserEvent.event_id))
        .filter(
            UserEvent.user_id == user_id,
            UserEvent.event_type == "lesson_completed",
        )
        .scalar()
        or 0
    )
    quizzes_taken = (
        db.query(func.count(UserEvent.event_id))
        .filter(
            UserEvent.user_id == user_id,
            UserEvent.event_type == "quiz_completed",
        )
        .scalar()
        or 0
    )

    avg_mastery = (
        db.query(func.avg(LearnerMasteryScore.score))
        .filter(LearnerMasteryScore.user_id == user_id)
        .scalar()
    )
    overall_mastery = round(float(avg_mastery) * 100.0, 1) if avg_mastery is not None else 0.0

    # Strengths/weaknesses: compute per-module mastery averages using curriculum mapping.
    mastery_rows = (
        db.query(LearnerMasteryScore)
        .filter(LearnerMasteryScore.user_id == user_id)
        .all()
    )
    module_mastery: dict[str, list[float]] = defaultdict(list)
    module_title_by_id: dict[str, str] = {}
    for row in mastery_rows:
        lesson = db.get(CurriculumLesson, str(row.lesson_id)) if row.lesson_id is not None else None
        if lesson is None:
            continue
        module = db.get(CurriculumModule, lesson.module_id)
        if module is None:
            continue
        mid = str(module.external_id)
        module_mastery[mid].append(float(row.score))
        module_title_by_id[mid] = module.title

    module_mastery_avg = []
    for mid, scores in module_mastery.items():
        if not scores:
            continue
        module_mastery_avg.append((mid, sum(scores) / len(scores)))
    module_mastery_avg.sort(key=lambda t: t[1], reverse=True)

    strengths = [module_title_by_id.get(mid, mid) for mid, _ in module_mastery_avg[:3]]
    weaknesses = [module_title_by_id.get(mid, mid) for mid, _ in module_mastery_avg[-3:]][::-1] if module_mastery_avg else []

    # Time per module from lesson_completed events
    lc_rows = (
        db.query(UserEvent)
        .filter(
            UserEvent.user_id == user_id,
            UserEvent.event_type == "lesson_completed",
        )
        .all()
    )
    module_ms: dict[str, int] = defaultdict(int)
    module_titles: dict[str, str] = {}
    for row in lc_rows:
        ms = _extract_time_spent_ms(row.event_data or {})
        ext_id = _extract_lesson_external_id(row.event_data or {})
        if ms is None or ext_id is None:
            continue
        lesson = (
            db.query(CurriculumLesson)
            .filter(CurriculumLesson.external_id == ext_id)
            .first()
        )
        if lesson is None:
            continue
        mod = db.get(CurriculumModule, lesson.module_id)
        if mod is None:
            continue
        key = str(mod.external_id)
        module_ms[key] += ms
        module_titles[key] = mod.title

    time_per_concept = [
        {
            "module_id": mid,
            "module_title": module_titles.get(mid, mid),
            "minutes": round(module_ms[mid] / 60000.0, 1),
        }
        for mid in sorted(module_ms.keys(), key=lambda k: module_ms[k], reverse=True)
    ]
    time_spent_minutes = round(sum(module_ms.values()) / 60000.0, 1)

    avg_score = (
        db.query(func.avg(AttentionMetric.attention_score))
        .filter(AttentionMetric.user_id == user_id, AttentionMetric.attention_score.isnot(None))
        .scalar()
    )
    avg_score_val = float(avg_score) if avg_score is not None else 0.0

    cutoff_py = datetime.now(timezone.utc) - timedelta(days=7)
    drift_count = (
        db.query(func.count(AttentionMetric.id))
        .filter(
            AttentionMetric.user_id == user_id,
            AttentionMetric.recorded_at >= cutoff_py,
            AttentionMetric.attention_score.isnot(None),
            AttentionMetric.attention_score < 0.4,
        )
        .scalar()
        or 0
    )

    attention_summary = {
        "average_attention_score": avg_score_val,
        "peak_focus_time": "",
        "drift_count": int(drift_count),
    }

    return {
        "user_id": str(user_id),
        "lessons_completed": int(lessons_completed),
        "quizzes_taken": int(quizzes_taken),
        "overall_mastery": overall_mastery,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "time_spent_minutes": time_spent_minutes,
        "time_per_concept": time_per_concept,
        "attention_summary": attention_summary,
    }
