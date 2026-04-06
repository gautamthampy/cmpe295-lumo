"""Event type names aligned with docs/event_schema.json (oneOf variants)."""

SCHEMA_EVENT_TYPES = frozenset(
    {
        "lesson_started",
        "lesson_completed",
        "quiz_started",
        "question_answered",
        "quiz_completed",
        "hint_requested",
        "feedback_provided",
        "attention_drift_detected",
        "break_suggested",
        "break_accepted",
        "break_declined",
        "re_quiz_triggered",
        "attention_mini_test_started",
        "attention_mini_test_completed",
        "attention_self_report",
        "gaze_attention_likelihood",
    }
)

MINI_TEST_EVENT_TYPES = frozenset({"attention_mini_test_started", "attention_mini_test_completed"})

SELF_REPORT_EVENT_TYPES = frozenset({"attention_self_report"})
GAZE_EVENT_TYPES = frozenset({"gaze_attention_likelihood"})

PERSIST_ONLY_EVENT_TYPES = (
    SCHEMA_EVENT_TYPES
    - {"question_answered"}
    - MINI_TEST_EVENT_TYPES
    - SELF_REPORT_EVENT_TYPES
    - GAZE_EVENT_TYPES
)
