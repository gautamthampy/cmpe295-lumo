from app.services.planner_service import PlannerService


class _StubPlanner(PlannerService):
    def _get_attention_state(self, student_id, session_id):  # type: ignore[override]
        return {"score": 0.3, "drift": True, "recommended_action": "recap"}

    def _get_recent_feedback_count(self, student_id, event_type):  # type: ignore[override]
        return 0

    def _get_progress(self, student_id):  # type: ignore[override]
        return {"lessons_completed": 0, "quizzes_taken": 0}


def test_planner_returns_micro_recap_when_attention_recommends_recap():
    svc = _StubPlanner(db=None)  # type: ignore[arg-type]
    recs = svc.recommend(student_id="00000000-0000-0000-0000-000000000001", session_id=None)
    assert recs
    assert any(r.get("action") == "micro_recap" for r in recs)

